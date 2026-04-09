import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from "@/lib/email";

/**
 * PRODUCTION RAZORPAY WEBHOOK
 *
 * Security & Reliability:
 * - Verifies Razorpay Webhook Signatures using crypto.timingSafeEqual
 * - Idempotent processing of webhook events (checks status before applying)
 * - Safe error ignoring for non-fatal errors to prevent webhook retries
 */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[WEBHOOK CONFIG ERROR] RAZORPAY_WEBHOOK_SECRET is not set.");
      // Return 500 so Razorpay retries if the secret is temporarily missing
      return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
    }

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify Signature Securely
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

    if (!isSignatureValid) {
      console.error("[WEBHOOK SECURITY WARNING] Invalid Razorpay Signature from IP:", request.headers.get("x-forwarded-for"));
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    const eventName = event.event;
    const paymentEntity = event.payload.payment?.entity;
    
    if (!paymentEntity) {
      return NextResponse.json({ error: "Malformed Payload" }, { status: 400 });
    }

    // `receipt` holds our internal Order ID (set in create-order)
    const orderId = paymentEntity.notes?.orderId || paymentEntity.receipt;
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const amount = paymentEntity.amount / 100; // converted from paise

    if (!orderId) {
      console.error(`[WEBHOOK] Event ${eventName} has no orderId mapped. PaymentID: ${razorpayPaymentId}`);
      return NextResponse.json({ success: true, message: "Unrelated event ignored" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      console.error(`[WEBHOOK] Order ${orderId} not found for event: ${eventName}`);
      return NextResponse.json({ success: true, message: "Order not found" });
    }

    // Handle the specific events
    if (eventName === "payment.captured" || eventName === "payment.authorized") {
      // Idempotency check: don't process if already paid
      if (order.paymentStatus === "completed") {
        return NextResponse.json({ success: true, message: "Order already completed" });
      }

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "completed",
          status: "paid",
          razorpayPaymentId
        }
      });

      // Log success webhook event
      await prisma.paymentLog.create({
        data: {
          orderId,
          ipAddress: "webhook",
          razorpayPaymentId,
          razorpayOrderId,
          signature: "webhook_signature",
          status: "verified",
          errorMessage: `Webhook ${eventName} received`,
          isRetry: false,
          attemptCount: 1,
        }
      });

      // Async email notification
      sendPaymentSuccessEmail(
        order.customerEmail,
        order.customerName,
        order.id,
        order.amount,
        order.paymentMethod
      ).catch((e: any) => console.error("[EMAIL] Fail:", e));

      console.log(`[WEBHOOK SUCCESS] Order ${orderId} marked as completed.`);
      return NextResponse.json({ success: true });

    } else if (eventName === "payment.failed") {
      // Ignore if order already handled successfully or failed
      if (order.paymentStatus !== "pending") {
         return NextResponse.json({ success: true, message: "Order already resolved" });
      }

      const failureReason = paymentEntity.error_description || "Webhook reported payment failure";

      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "failed",
          failureReason
        }
      });

      // Log failure webhook event
      await prisma.paymentLog.create({
        data: {
          orderId,
          ipAddress: "webhook",
          razorpayPaymentId,
          razorpayOrderId: razorpayOrderId || "unknown",
          signature: "webhook_signature",
          status: "failed",
          errorMessage: failureReason,
          isRetry: false,
          attemptCount: 1,
        }
      });

      sendPaymentFailureEmail(
        order.customerEmail,
        order.customerName,
        order.id,
        order.amount,
        failureReason
      ).catch((e: any) => console.error("[EMAIL] Fail:", e));

      console.log(`[WEBHOOK FAILED] Order ${orderId} marked as failed. Reason: ${failureReason}`);
      return NextResponse.json({ success: true });
    }

    // Default return for standard webhook ping/unhandled events
    return NextResponse.json({ success: true, message: "Event ignored" });

  } catch (error) {
    console.error("[WEBHOOK EXCEPTION]", error);
    // Don't fail the webhook unless it's a real server error to prevent retries of bad data
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
