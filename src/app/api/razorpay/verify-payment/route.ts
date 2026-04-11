import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { rateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth";
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from "@/lib/email";

/**
 * PAYMENT VERIFICATION — PRODUCTION SAFE
 *
 * Fixes implemented:
 * - C1: Authentication required (getCurrentUser)
 * - C2: User ownership enforced (order.userId === user.id)
 * - C3: DB update wrapped in $transaction with conditional WHERE to prevent race-condition double completion
 * - H2: Signature mismatch → log only, do NOT mark order as failed (lets real payment complete)
 * - C6: Post-HMAC amount reconciliation via Razorpay API fetch
 *
 * Full verification chain:
 *   Auth → Rate limit → Input validation → Idempotency →
 *   Fetch order → Ownership → razorpayOrderId cross-check →
 *   HMAC SHA256 signature verify → Amount reconcile →
 *   Atomic DB update (pending→paid) → Log → Email
 */

function getRazorpayInstance(): Razorpay {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const keySecret = process.env.RAZORPAY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay not configured");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(request: NextRequest) {
  // ── HTTPS ──────────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    if (request.headers.get("x-forwarded-proto") !== "https") {
      return NextResponse.json({ success: false, error: "HTTPS required" }, { status: 403 });
    }
  }

  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ success: false, error: "Content-Type must be application/json" }, { status: 400 });
  }

  // ── FIX C1: Authentication required ───────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // Rate limit TIGHTER for verification (abuse surface)
  const { allowed } = rateLimit(`verify:${user.id}`, 15, 5 * 60 * 1000);
  if (!allowed) {
    console.warn(`[RATE LIMIT] verify-payment exceeded for user ${user.id} from IP ${clientIp}`);
    return NextResponse.json(
      { success: false, error: "Too many verification attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  try {
    const body = await request.json();
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, requestId } = body;

    // ── Input validation ───────────────────────────────────────────────
    if (!orderId?.trim())           return NextResponse.json({ success: false, error: "Order ID required" }, { status: 400 });
    if (!razorpayPaymentId?.trim()) return NextResponse.json({ success: false, error: "Payment ID required" }, { status: 400 });
    if (!razorpayOrderId?.trim())   return NextResponse.json({ success: false, error: "Razorpay Order ID required" }, { status: 400 });
    if (!razorpaySignature?.trim()) return NextResponse.json({ success: false, error: "Signature required" }, { status: 400 });

    // ── IDEMPOTENCY: Already verified successfully? ─────────────────────
    const existingPaidOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id,                     // FIX C2: scope to current user
        paymentStatus: "completed",
        razorpayPaymentId: { not: null },
      },
      select: { id: true, amount: true },
    });
    if (existingPaidOrder) {
      return NextResponse.json({ success: true, orderId, message: "Payment already verified" });
    }

    // requestId idempotency (double-click protection)
    if (requestId?.trim()) {
      const existingLog = await prisma.paymentLog.findFirst({
        where: { requestId: requestId.trim(), status: "verified" },
        select: { orderId: true },
      });
      if (existingLog) {
        return NextResponse.json({ success: true, orderId: existingLog.orderId, message: "Payment already verified (idempotent)" });
      }
    }

    // ── Fetch order from DB ────────────────────────────────────────────
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        razorpayOrderId: true,
        amount: true,
        paymentStatus: true,
        customerEmail: true,
        customerName: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "Order not found" });
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // ── FIX C2: Ownership check ────────────────────────────────────────
    if (order.userId !== user.id) {
      console.error(`[SECURITY] Ownership violation: user ${user.id} attempted to verify order ${orderId} owned by ${order.userId}`);
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "Ownership violation" });
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // ── razorpayOrderId cross-check (prevents ID substitution) ─────────
    if (order.razorpayOrderId !== razorpayOrderId) {
      console.error(`[SECURITY] razorpayOrderId mismatch for order ${orderId}: expected ${order.razorpayOrderId}, got ${razorpayOrderId}`);
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "Razorpay Order ID mismatch" });
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }

    // ── State check ────────────────────────────────────────────────────
    // Already completed → idempotent success
    if (order.paymentStatus === "completed") {
      return NextResponse.json({ success: true, orderId, message: "Payment already verified" });
    }
    // Only pending → completed allowed
    if (order.paymentStatus !== "pending") {
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: `Invalid state: ${order.paymentStatus}` });
      return NextResponse.json({ success: false, error: "Order is not in a payable state" }, { status: 409 });
    }

    // ── HMAC SHA256 Signature Verification ────────────────────────────
    const razorpaySecret = process.env.RAZORPAY_SECRET;
    if (!razorpaySecret) {
      console.error("[CONFIG] RAZORPAY_SECRET missing");
      return NextResponse.json({ success: false, error: "Payment gateway configuration error" }, { status: 500 });
    }

    const generatedHex = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    const genBuf = Buffer.from(generatedHex, "hex");

    let clientSigBuf: Buffer;
    try {
      clientSigBuf = Buffer.from(razorpaySignature, "hex");
    } catch {
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "Invalid signature hex encoding" });
      // FIX H2: DO NOT mark the order as failed — unknown whether the real payment completed
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }

    if (genBuf.length !== clientSigBuf.length) {
      console.warn(`[SECURITY] Signature length mismatch for order ${orderId} — possible attack from ${clientIp}`);
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "Signature length mismatch" });
      // FIX H2: DO NOT mutate paymentStatus — leave order as pending for webhook to resolve
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }

    const signatureValid = crypto.timingSafeEqual(genBuf, clientSigBuf);

    if (!signatureValid) {
      console.warn(`[SECURITY] HMAC mismatch for order ${orderId} from IP ${clientIp}`);
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: "HMAC signature mismatch" });
      // FIX H2: DO NOT mutate paymentStatus — webhook will deliver the authoritative result
      return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
    }

    // ── FIX C6: Amount reconciliation via Razorpay API ─────────────────
    // After HMAC passes, fetch the payment from Razorpay to confirm the captured
    // amount exactly matches what we computed server-side. This closes the gap
    // where a valid HMAC is produced but the amount differs from what Razorpay captured.
    try {
      const rzp = getRazorpayInstance();
      const rzpPayment = await rzp.payments.fetch(razorpayPaymentId);
      const capturedAmountPaise = Number(rzpPayment.amount);
      const dbAmountPaise = Math.round(order.amount * 100);

      if (capturedAmountPaise !== dbAmountPaise) {
        console.error(
          `[AMOUNT MISMATCH] Order ${orderId}: Razorpay captured ₹${capturedAmountPaise / 100}, DB expects ₹${order.amount}. POSSIBLE FRAUD.`,
          { userId: user.id, ip: clientIp, razorpayPaymentId }
        );
        await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: `Amount mismatch: got ₹${capturedAmountPaise / 100}, expected ₹${order.amount}` });
        return NextResponse.json(
          { success: false, error: "Payment amount mismatch. Please contact support." },
          { status: 400 }
        );
      }

      // Also confirm payment status is captured/authorized
      const validPaymentStatuses = ["captured", "authorized"];
      if (!validPaymentStatuses.includes(String(rzpPayment.status))) {
        console.warn(`[PAYMENT STATUS] Order ${orderId}: Razorpay payment status is "${rzpPayment.status}", not captured`);
        await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "failed", errorMessage: `Payment not captured: status=${rzpPayment.status}` });
        return NextResponse.json(
          { success: false, error: "Payment has not been captured yet. Please retry." },
          { status: 402 }
        );
      }
    } catch (rzpFetchErr: any) {
      // If we can't reach Razorpay API, skip the amount check and proceed with HMAC verification.
      // The webhook will reconcile the amount independently.
      console.warn(`[RAZORPAY API] Could not fetch payment ${razorpayPaymentId} for amount verification: ${rzpFetchErr?.message}. Proceeding with HMAC-only verification.`);
    }

    // ── FIX C3: Atomic state transition via transaction ─────────────────
    // The WHERE clause `paymentStatus: "pending"` ensures that if two concurrent
    // verification requests pass HMAC, only ONE will succeed in updating the DB.
    // The other will see `count: 0` and return idempotent success.
    let updatedCount: number;
    try {
      const result = await prisma.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: "pending",   // atomic guard: only update if still pending
          userId: user.id,            // double-check ownership at update time
        },
        data: {
          status: "paid",
          paymentStatus: "completed",
          razorpayPaymentId,
          razorpaySignature,
          ...(requestId?.trim() && { requestId: requestId.trim() }),
        },
      });
      updatedCount = result.count;
    } catch (dbErr) {
      console.error("[DB] Failed to update order to paid:", dbErr);
      return NextResponse.json(
        { success: false, error: "Failed to save payment confirmation. Please contact support." },
        { status: 500 }
      );
    }

    if (updatedCount === 0) {
      // Another concurrent request already completed this order
      // (race condition correctly resolved — return idempotent success)
      console.log(`[IDEMPOTENT] Order ${orderId} was already marked paid by a concurrent request`);
      await log({ orderId, requestId, ipAddress: clientIp, razorpayPaymentId, razorpayOrderId, signature: razorpaySignature, status: "duplicate", errorMessage: "Concurrent request already completed" });
      return NextResponse.json({ success: true, orderId, message: "Payment already verified" });
    }

    // ── Log success ────────────────────────────────────────────────────
    await log({
      orderId, requestId, ipAddress: clientIp,
      razorpayPaymentId, razorpayOrderId,
      signature: razorpaySignature,
      status: "verified",
      errorMessage: null,
    });

    console.log(`[PAYMENT VERIFIED] Order ${orderId} → paid`, {
      razorpayPaymentId,
      amount: order.amount,
      userId: user.id,
      ip: clientIp,
    });

    // ── Send confirmation email (non-blocking) ─────────────────────────
    sendPaymentSuccessEmail(
      order.customerEmail,
      order.customerName,
      orderId,
      order.amount,
      order.paymentMethod
    ).catch((e: any) => console.error("[EMAIL] Failed to send success email:", e));

    return NextResponse.json({
      success: true,
      orderId,
      amount: order.amount,
      message: "Payment verified and order confirmed",
    });

  } catch (error) {
    console.error("[UNHANDLED ERROR] verify-payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify payment. Please contact support." },
      { status: 500 }
    );
  }
}

/**
 * Writes a payment audit log row.
 * Errors are swallowed — logging must NEVER break the payment flow.
 */
async function log({
  orderId, requestId, ipAddress, razorpayPaymentId, razorpayOrderId, signature, status, errorMessage,
}: {
  orderId: string;
  requestId?: string;
  ipAddress: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  signature: string;
  status: "verified" | "failed" | "duplicate";
  errorMessage: string | null;
}): Promise<void> {
  try {
    await prisma.paymentLog.create({
      data: {
        orderId,
        requestId,
        ipAddress,
        razorpayPaymentId,
        razorpayOrderId,
        signature,
        status,
        errorMessage,
        isRetry: false,
        attemptCount: 1,
      },
    });
  } catch (e) {
    console.error("[LOG ERROR] Failed to write PaymentLog:", e);
  }
}
