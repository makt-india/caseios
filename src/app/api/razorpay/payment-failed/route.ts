import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";

/**
 * PAYMENT FAILED / CANCELLED ENDPOINT
 *
 * Called when:
 * - User dismisses the Razorpay modal (ondismiss)
 * - Payment explicitly fails in Razorpay (payment.failed event)
 *
 * Before this endpoint existed, cancelled orders would stay as "pending" forever
 * in the admin panel — making it impossible to distinguish intent from failure.
 *
 * This endpoint marks the order as failed with a reason so:
 * - Admin panel shows correct status (failed, not pending)
 * - Revenue calculation excludes it correctly
 * - Admin can decide to retry or reach out to the customer
 */
export async function POST(request: NextRequest) {
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

  // RATE LIMITING: 30 failure reports per 5 minutes per IP
  const { allowed } = rateLimit(`payment-failed:${clientIp}`, 30, 5 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  try {
    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId || typeof orderId !== "string" || !orderId.trim()) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Lookup the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, status: true, razorpayOrderId: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Only mark as failed if it's still in pending state
    // Don't overwrite a successfully paid order with "failed"
    if (order.paymentStatus !== "pending") {
      return NextResponse.json({
        success: true,
        message: `Order already in state: ${order.paymentStatus}`,
      });
    }

    const failureReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim().slice(0, 500)   // cap at 500 chars
        : "Payment cancelled by user";

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "failed",
        failureReason,
      },
    });

    console.log(`[PAYMENT FAILED] Order ${orderId} marked as failed. Reason: ${failureReason}`);

    try {
      await prisma.paymentLog.create({
        data: {
          orderId,
          ipAddress: clientIp,
          razorpayPaymentId: "cancelled_or_failed",
          razorpayOrderId: order.razorpayOrderId || "unknown", // assuming order schema has razorpayOrderId or fallback to unknown
          signature: "none",
          status: "failed",
          errorMessage: failureReason,
          isRetry: false,
          attemptCount: 1,
        },
      });
    } catch (logError) {
      console.error("[LOG ERROR] Could not save to paymentLog:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Order marked as failed",
    });
  } catch (error) {
    console.error("[UNHANDLED ERROR] payment-failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
