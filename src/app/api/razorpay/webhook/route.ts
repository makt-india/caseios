import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from "@/lib/email";

/**
 * RAZORPAY WEBHOOK — PRODUCTION SAFE
 *
 * Fixes implemented:
 * - C5/H3: Cross-checks razorpayOrderId from event against DB (prevents tampered webhook from
 *   marking the wrong order as paid)
 * - Atomic updateMany with conditional WHERE (same race-condition guard as verify-payment)
 * - Returns 400 (not 500) on invalid signatures so Razorpay does not retry indefinitely
 * - All length checks before timingSafeEqual (prevents TypeError panic)
 * - Idempotent: checks current paymentStatus before any mutation
 *
 * CRITICAL: This webhook is the source of truth when client-side verification fails.
 * It MUST complete successfully for real money to be properly recorded.
 */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // ── Webhook secret must be configured ─────────────────────────────
    if (!webhookSecret) {
      console.error("[WEBHOOK CONFIG] RAZORPAY_WEBHOOK_SECRET not set — retrying will keep failing");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }

    // ── Signature header must be present ──────────────────────────────
    if (!signature) {
      console.warn("[WEBHOOK] Request with missing x-razorpay-signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // ── Compute expected HMAC ──────────────────────────────────────────
    const expectedHex = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHex, "hex");

    let receivedBuf: Buffer;
    try {
      receivedBuf = Buffer.from(signature, "hex");
    } catch {
      console.error("[WEBHOOK SECURITY] Non-hex signature header:", signature?.slice(0, 20));
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    // Length check BEFORE timingSafeEqual to prevent TypeError panic → 500 → infinite Razorpay retry
    if (expectedBuf.length !== receivedBuf.length) {
      console.error(`[WEBHOOK SECURITY] Signature length mismatch: expected ${expectedBuf.length}B, got ${receivedBuf.length}B`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      console.error("[WEBHOOK SECURITY] Invalid signature — possible replay or spoofing attempt from IP:", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ── Parse event ────────────────────────────────────────────────────
    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const eventName: string = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      // Some webhook events (like order.paid) have different payload shape
      console.log(`[WEBHOOK] Ignoring event without payment entity: ${eventName}`);
      return NextResponse.json({ success: true, message: "Event ignored" });
    }

    // Extract IDs from the webhook payload
    const razorpayPaymentId: string = paymentEntity.id;
    const razorpayOrderId: string = paymentEntity.order_id;
    // Our internal orderId is stored in the Razorpay order notes (patched after DB creation)
    const orderId: string | undefined = paymentEntity.notes?.orderId || paymentEntity.receipt?.replace("rcpt_", "");

    if (!orderId || !razorpayOrderId || !razorpayPaymentId) {
      console.error(`[WEBHOOK] Missing IDs in event ${eventName}:`, { orderId, razorpayOrderId, razorpayPaymentId });
      return NextResponse.json({ success: true, message: "Event missing required IDs — ignored" });
    }

    // ── Fetch order from DB by our internal ID ─────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        razorpayOrderId: true,
        paymentStatus: true,
        amount: true,
        customerEmail: true,
        customerName: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      // Could be a test event or a mismatched receipt — don't return 4xx (causes Razorpay retry)
      console.warn(`[WEBHOOK] Order ${orderId} not found in DB for event ${eventName}`);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    // ── FIX C5/H3: Cross-check razorpayOrderId ────────────────────────
    // Prevents a tampered webhook from marking one order paid using another order's payment.
    if (order.razorpayOrderId !== razorpayOrderId) {
      console.error(
        `[WEBHOOK SECURITY] razorpayOrderId mismatch for order ${orderId}: DB has ${order.razorpayOrderId}, webhook sent ${razorpayOrderId}`
      );
      // Return 400 so Razorpay does NOT retry (this is a data integrity issue, not a transient error)
      return NextResponse.json({ error: "Order ID mismatch" }, { status: 400 });
    }

    // ── Handle event types ─────────────────────────────────────────────
    if (eventName === "payment.captured" || eventName === "payment.authorized") {
      const amountPaise = Number(paymentEntity.amount);
      const dbAmountPaise = Math.round(order.amount * 100);

      // Amount reconciliation — flag discrepancy but don't block (amount mismatch on capture
      // is Razorpay's side; we still mark the order paid but log it for manual review)
      if (amountPaise !== dbAmountPaise) {
        console.error(
          `[WEBHOOK AMOUNT MISMATCH] Order ${orderId}: Razorpay captured ₹${amountPaise / 100}, DB expects ₹${order.amount}. REVIEW REQUIRED.`,
          { razorpayPaymentId, razorpayOrderId }
        );
      }

      // Idempotency — already completed
      if (order.paymentStatus === "completed") {
        console.log(`[WEBHOOK IDEMPOTENT] Order ${orderId} already completed`);
        return NextResponse.json({ success: true, message: "Already completed" });
      }

      // FIX C3 applied here too: updateMany with WHERE paymentStatus=pending so only one wins
      const result = await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: "pending" },
        data: {
          paymentStatus: "completed",
          status: "paid",
          razorpayPaymentId,
        },
      });

      if (result.count > 0) {
        await prisma.paymentLog.create({
          data: {
            orderId,
            ipAddress: "webhook",
            razorpayPaymentId,
            razorpayOrderId,
            signature: "webhook_verified",
            status: "verified",
            errorMessage: `Webhook: ${eventName}`,
            isRetry: false,
            attemptCount: 1,
          },
        }).catch((e: any) => console.error("[LOG] PaymentLog write failed:", e));

        sendPaymentSuccessEmail(
          order.customerEmail,
          order.customerName,
          order.id,
          order.amount,
          order.paymentMethod
        ).catch((e: any) => console.error("[EMAIL] Fail:", e));

        console.log(`[WEBHOOK SUCCESS] Order ${orderId} marked paid via ${eventName}`);
      } else {
        console.log(`[WEBHOOK RACE] Order ${orderId} was already updated by a concurrent request`);
      }

      return NextResponse.json({ success: true });

    } else if (eventName === "payment.failed") {
      const failureReason =
        paymentEntity.error_description ||
        paymentEntity.error_reason ||
        "Webhook: payment.failed";

      // Only update if still pending — never overwrite a completed order
      const result = await prisma.order.updateMany({
        where: { id: orderId, paymentStatus: "pending" },
        data: { paymentStatus: "failed", failureReason },
      });

      if (result.count > 0) {
        await prisma.paymentLog.create({
          data: {
            orderId,
            ipAddress: "webhook",
            razorpayPaymentId,
            razorpayOrderId: razorpayOrderId || "unknown",
            signature: "webhook_verified",
            status: "failed",
            errorMessage: failureReason,
            isRetry: false,
            attemptCount: 1,
          },
        }).catch((e: any) => console.error("[LOG] PaymentLog write failed:", e));

        sendPaymentFailureEmail(
          order.customerEmail,
          order.customerName,
          order.id,
          order.amount,
          failureReason
        ).catch((e: any) => console.error("[EMAIL] Fail:", e));

        console.log(`[WEBHOOK FAILED] Order ${orderId} marked failed: ${failureReason}`);
      }

      return NextResponse.json({ success: true });
    }

    // Unhandled event type (e.g., refund.created, order.paid) — log and acknowledge
    console.log(`[WEBHOOK] Unhandled event type: ${eventName}`);
    return NextResponse.json({ success: true, message: `${eventName} acknowledged` });

  } catch (error) {
    console.error("[WEBHOOK EXCEPTION]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
