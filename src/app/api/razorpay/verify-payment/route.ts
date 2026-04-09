import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { rateLimit } from "@/lib/rateLimit";
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from "@/lib/email";

/**
 * PRODUCTION-GRADE PAYMENT VERIFICATION API
 *
 * Security features:
 * - HMAC SHA256 signature verification with crypto.timingSafeEqual (not manual loop)
 * - Rate limiting by IP (100 requests per 5 minutes)
 * - Idempotency via requestId (duplicate verification returns success)
 * - State machine: only pending → completed is allowed
 * - FIXED: Failed/cancelled payments now persist paymentStatus="failed" to DB
 * - Payment log for audit trail and fraud detection
 * - Email notifications for success and failure
 */

export async function POST(request: NextRequest) {
  // SECURITY: Enforce HTTPS in production
  if (process.env.NODE_ENV === "production") {
    const protocol = request.headers.get("x-forwarded-proto");
    if (protocol !== "https") {
      return NextResponse.json(
        { success: false, error: "HTTPS required" },
        { status: 403 }
      );
    }
  }

  // VALIDATION: Ensure Content-Type is application/json
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { success: false, error: "Content-Type must be application/json" },
      { status: 400 }
    );
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // RATE LIMITING: 100 requests per 5 minutes per IP
  const rateLimitKey = `payment-verify:${clientIp}`;
  const { allowed } = rateLimit(rateLimitKey, 100, 5 * 60 * 1000);

  if (!allowed) {
    console.warn(`[RATE LIMIT] Payment verification rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { success: false, error: "Too many verification attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  try {
    const body = await request.json();
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, requestId } = body;

    // INPUT VALIDATION — all four IDs are required
    if (!orderId?.trim()) {
      return NextResponse.json({ success: false, error: "Order ID is required" }, { status: 400 });
    }
    if (!razorpayPaymentId?.trim()) {
      return NextResponse.json({ success: false, error: "Payment ID is required" }, { status: 400 });
    }
    if (!razorpayOrderId?.trim()) {
      return NextResponse.json({ success: false, error: "Razorpay Order ID is required" }, { status: 400 });
    }
    if (!razorpaySignature?.trim()) {
      return NextResponse.json({ success: false, error: "Signature is required" }, { status: 400 });
    }

    // IDEMPOTENCY CHECK 1: Order already successfully paid?
    const existingPaidOrder = await prisma.order.findFirst({
      where: { id: orderId, paymentStatus: "completed", razorpayPaymentId: { not: null } },
    });
    if (existingPaidOrder) {
      return NextResponse.json({
        success: true,
        orderId,
        message: "Payment already verified (idempotent)",
      });
    }

    // IDEMPOTENCY CHECK 2: requestId already has a verified log entry?
    if (requestId) {
      const existingLog = await prisma.paymentLog.findFirst({
        where: { requestId, status: "verified" },
      });
      if (existingLog) {
        return NextResponse.json({
          success: true,
          orderId: existingLog.orderId,
          message: "Payment already verified (idempotent)",
        });
      }
    }

    // FETCH ORDER — verify it exists
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      await logPaymentAttempt({
        orderId, requestId, ipAddress: clientIp,
        razorpayPaymentId, razorpayOrderId,
        signature: razorpaySignature,
        status: "failed",
        errorMessage: "Order not found",
      });

      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    // VERIFY RAZORPAY ORDER ID MATCHES our DB record (prevents ID substitution attack)
    if (order.razorpayOrderId !== razorpayOrderId) {
      console.error(
        `[SECURITY] Razorpay Order ID mismatch for order ${orderId}: expected ${order.razorpayOrderId}, got ${razorpayOrderId}`
      );

      await logPaymentAttempt({
        orderId, requestId, ipAddress: clientIp,
        razorpayPaymentId, razorpayOrderId,
        signature: razorpaySignature,
        status: "failed",
        errorMessage: "Razorpay Order ID mismatch",
      });

      return NextResponse.json(
        { success: false, error: "Order verification failed" },
        { status: 400 }
      );
    }

    // VERIFY HMAC SHA256 SIGNATURE using crypto.timingSafeEqual
    // The correct way to do constant-time comparison in Node.js — not a manual char loop.
    const razorpaySecret = process.env.RAZORPAY_SECRET;
    if (!razorpaySecret) {
      console.error("[CONFIG] RAZORPAY_SECRET not set");
      return NextResponse.json(
        { success: false, error: "Payment gateway configuration error" },
        { status: 500 }
      );
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    // timingSafeEqual requires same-length Buffers; hex strings are always same length per HMAC
    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "hex"),
      Buffer.from(razorpaySignature.padEnd(generatedSignature.length, "0"), "hex").slice(
        0,
        generatedSignature.length
      )
    );

    if (!signatureValid) {
      console.warn(
        `[SECURITY] Payment signature mismatch for order ${orderId} from IP ${clientIp}`
      );

      // FIXED: Persist failed state to DB so admin panel reflects reality
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "failed",
          failureReason: "Signature verification failed",
        },
      });

      await logPaymentAttempt({
        orderId, requestId, ipAddress: clientIp,
        razorpayPaymentId, razorpayOrderId,
        signature: razorpaySignature,
        status: "failed",
        errorMessage: "Signature verification failed",
      });

      // Notify customer of failure
      await sendPaymentFailureEmail(
        order.customerEmail,
        order.customerName,
        order.id,
        order.amount,
        "Payment signature verification failed"
      ).catch((e: any) => console.error("[EMAIL] Failed to send failure email:", e));

      return NextResponse.json(
        { success: false, error: "Payment verification failed" },
        { status: 400 }
      );
    }

    // STATE MACHINE: Only allow pending → completed transition
    if (order.paymentStatus === "completed" && order.razorpayPaymentId) {
      // Already paid — idempotent success
      return NextResponse.json({
        success: true,
        orderId: order.id,
        message: "Payment already verified",
      });
    }

    if (order.paymentStatus !== "pending") {
      await logPaymentAttempt({
        orderId, requestId, ipAddress: clientIp,
        razorpayPaymentId, razorpayOrderId,
        signature: razorpaySignature,
        status: "failed",
        errorMessage: `Invalid state transition: ${order.paymentStatus} → completed`,
      });

      return NextResponse.json(
        { success: false, error: "Order is not in a payable state" },
        { status: 409 }
      );
    }

    // MARK ORDER AS PAID — atomic update
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "paid",
        paymentStatus: "completed",
        razorpayPaymentId,
        razorpaySignature,
        ...(requestId && { requestId }),
      },
      include: { items: { include: { product: true } } },
    });

    // LOG success
    await logPaymentAttempt({
      orderId, requestId, ipAddress: clientIp,
      razorpayPaymentId, razorpayOrderId,
      signature: razorpaySignature,
      status: "verified",
      errorMessage: null,
    });

    // SEND SUCCESS EMAIL (non-blocking — don't fail the response if email fails)
    sendPaymentSuccessEmail(
      updatedOrder.customerEmail,
      updatedOrder.customerName,
      updatedOrder.id,
      updatedOrder.amount,
      updatedOrder.paymentMethod
    ).catch((e: any) => console.error("[EMAIL] Failed to send success email:", e));

    console.log(`[PAYMENT OK] Order ${orderId} marked as paid`, {
      razorpayPaymentId,
      amount: updatedOrder.amount,
      customer: updatedOrder.customerEmail,
    });

    return NextResponse.json({
      success: true,
      orderId: updatedOrder.id,
      amount: updatedOrder.amount,
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
 * Logs a payment verification attempt to the audit trail.
 * Errors here are swallowed — logging must never break the payment flow.
 */
async function logPaymentAttempt({
  orderId,
  requestId,
  ipAddress,
  razorpayPaymentId,
  razorpayOrderId,
  signature,
  status,
  errorMessage,
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
  } catch (logError) {
    console.error("[LOG ERROR] Failed to write payment log:", logError);
  }
}
