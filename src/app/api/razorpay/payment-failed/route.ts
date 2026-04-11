import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/auth";

/**
 * PAYMENT CANCELLED / DISMISSED ENDPOINT
 *
 * Called ONLY when the user dismisses the Razorpay modal (ondismiss).
 * This is a CLIENT-SIDE signal — NOT authoritative.
 *
 * CRITICAL DESIGN DECISION:
 *   We do NOT set paymentStatus = "failed" here.
 *   Reason: the user may have completed payment before closing the modal
 *   (race condition). The webhook is the authoritative source.
 *
 *   We only log the cancellation intent and set a failureReason for UX.
 *   The order stays "pending" so:
 *     - The webhook can still mark it completed ✓
 *     - The reconciliation cron can still recover it ✓
 *     - The user can retry payment on the same orderId ✓
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json(
      { success: false, error: "Content-Type must be application/json" },
      { status: 400 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(`payment-cancelled:${clientIp}`, 30, 5 * 60 * 1000);
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
      return NextResponse.json({ success: false, error: "Order ID required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, paymentStatus: true, razorpayOrderId: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== user.id) {
      console.warn(`[SECURITY] User ${user.id} attempted to cancel order ${orderId} (owner: ${order.userId})`);
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // If already completed by webhook (race condition) — return success quietly
    if (order.paymentStatus === "completed") {
      console.log(`[CANCEL RACE] Order ${orderId} already completed — cancellation ignored`);
      return NextResponse.json({ success: true, message: "Order already completed" });
    }

    const cancelReason =
      typeof reason === "string" && reason.trim()
        ? reason.trim().slice(0, 500)
        : "Payment dismissed by user";

    // KEEP paymentStatus = "pending" — do NOT set to "failed"
    // Store reason in failureReason for UX display only
    await prisma.order.update({
      where: { id: orderId },
      data: { failureReason: `[DISMISSED] ${cancelReason}` },
    });

    // Non-blocking audit log
    prisma.paymentLog.create({
      data: {
        orderId,
        ipAddress: clientIp,
        razorpayPaymentId: "dismissed",
        razorpayOrderId: order.razorpayOrderId ?? "unknown",
        signature: "none",
        status: "failed",
        errorMessage: cancelReason,
        isRetry: false,
        attemptCount: 1,
      },
    }).catch((e: any) => console.error("[LOG] PaymentLog write failed:", e));

    console.log(
      `[PAYMENT DISMISSED] Order ${orderId} dismissed by user ${user.id} — stays pending for webhook/cron recovery`
    );

    return NextResponse.json({ success: true, message: "Cancellation noted" });

  } catch (error) {
    console.error("[UNHANDLED ERROR] payment-failed:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
