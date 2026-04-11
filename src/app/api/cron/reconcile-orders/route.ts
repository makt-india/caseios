import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { sendPaymentSuccessEmail, sendPaymentFailureEmail } from "@/lib/email";

/**
 * ORDER RECONCILIATION CRON JOB
 * ─────────────────────────────
 * Route:    GET /api/cron/reconcile-orders
 * Schedule: Every 15 minutes (configured in vercel.json)
 *
 * PURPOSE:
 *   Finds orders stuck in "pending" state (>10 min old) and reconciles
 *   their actual payment status against the Razorpay API.
 *
 * HANDLES:
 *   - Webhook delivery failures (Razorpay couldn't reach our server)
 *   - User closing browser before verify-payment completed
 *   - Server crashes mid-payment
 *   - Network timeouts between Razorpay and our API
 *
 * SECURITY:
 *   - Must be called with Authorization: Bearer <CRON_SECRET>
 *   - Vercel cron jobs send this header automatically when configured
 *   - Can also be triggered manually for backfill
 *
 * FLOW PER ORDER:
 *   1. Fetch all payments for the Razorpay Order ID
 *   2. If any payment is "captured" or "authorized" → mark completed
 *   3. If all payments are "failed" and order is >30min old → mark failed
 *   4. Otherwise → leave pending (payment may still be in progress)
 */

const PENDING_THRESHOLD_MINUTES = 10;  // orders older than this are checked
const FAILED_THRESHOLD_MINUTES   = 30; // orders older than this with no captured payment = failed
const MAX_ORDERS_PER_RUN         = 50; // cap to stay within Razorpay rate limits

function getRazorpay(): Razorpay {
  const keyId     = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const keySecret = process.env.RAZORPAY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("[CRON CONFIG] Razorpay credentials not set");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("[CRON] Unauthorized reconciliation attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // In development without CRON_SECRET, allow but log a warning
    if (process.env.NODE_ENV === "production") {
      console.error("[CRON CONFIG] CRON_SECRET is not set — endpoint is unprotected in production!");
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
    }
    console.warn("[CRON] Running without CRON_SECRET (development only)");
  }

  const startTime = Date.now();
  const results = {
    scanned:   0,
    completed: 0,
    failed:    0,
    skipped:   0,
    errors:    0,
  };

  try {
    const rzp = getRazorpay();

    const pendingThreshold = new Date(Date.now() - PENDING_THRESHOLD_MINUTES * 60 * 1000);
    const failedThreshold  = new Date(Date.now() - FAILED_THRESHOLD_MINUTES  * 60 * 1000);

    // ── Fetch stuck pending orders ─────────────────────────────────────
    const stuckOrders = await prisma.order.findMany({
      where: {
        paymentStatus: "pending",
        createdAt: { lt: pendingThreshold },        // older than threshold
        razorpayOrderId: { not: { startsWith: "PENDING_" } }, // exclude legacy temp IDs
      },
      select: {
        id:               true,
        razorpayOrderId:  true,
        amount:           true,
        customerEmail:    true,
        customerName:     true,
        paymentMethod:    true,
        createdAt:        true,
      },
      orderBy: { createdAt: "asc" }, // oldest first
      take: MAX_ORDERS_PER_RUN,
    });

    results.scanned = stuckOrders.length;
    console.info(`[CRON] Reconciling ${stuckOrders.length} pending orders`);

    // ── Process each order ─────────────────────────────────────────────
    for (const order of stuckOrders) {
      try {
        // Fetch payments for this Razorpay order
        const paymentsResponse = await rzp.orders.fetchPayments(order.razorpayOrderId) as any;
        const payments: any[] = paymentsResponse?.items ?? [];

        // Check for any captured/authorized payment
        const capturedPayment = payments.find(
          (p: any) => p.status === "captured" || p.status === "authorized"
        );

        if (capturedPayment) {
          // ── MARK COMPLETED ───────────────────────────────────────────
          const capturedAmountPaise = Number(capturedPayment.amount);
          const dbAmountPaise       = Math.round(order.amount * 100);

          if (capturedAmountPaise !== dbAmountPaise) {
            console.error(
              `[CRON AMOUNT MISMATCH] Order ${order.id}: Razorpay ₹${capturedAmountPaise / 100} vs DB ₹${order.amount} — MANUAL REVIEW REQUIRED`,
              { razorpayPaymentId: capturedPayment.id }
            );
          }

          const updateResult = await prisma.order.updateMany({
            where: { id: order.id, paymentStatus: "pending" }, // atomic guard
            data: {
              paymentStatus:    "completed",
              status:           "paid",
              razorpayPaymentId: capturedPayment.id,
            },
          });

          if (updateResult.count > 0) {
            // Audit log
            await prisma.paymentLog.create({
              data: {
                orderId:          order.id,
                ipAddress:        "cron-reconciliation",
                razorpayPaymentId: capturedPayment.id,
                razorpayOrderId:   order.razorpayOrderId,
                signature:        "cron_verified",
                status:           "verified",
                errorMessage:     "Recovered by reconciliation cron",
                isRetry:          false,
                attemptCount:     1,
              },
            }).catch((e: any) => console.error("[CRON LOG] PaymentLog write failed:", e));

            // Send success email (non-blocking)
            sendPaymentSuccessEmail(
              order.customerEmail,
              order.customerName,
              order.id,
              order.amount,
              order.paymentMethod
            ).catch((e: any) => console.error("[CRON EMAIL] Success email failed:", e));

            results.completed++;
            console.info(
              `[CRON RECOVERED] Order ${order.id} → completed via payment ${capturedPayment.id}`
            );
          } else {
            // Was already updated by a concurrent webhook — idempotent skip
            results.skipped++;
            console.info(`[CRON SKIP] Order ${order.id} already updated by concurrent process`);
          }

          continue; // move to next order
        }

        // ── Check if order is old enough to declare definitively failed ─
        const isOldEnoughToFail = order.createdAt < failedThreshold;

        if (isOldEnoughToFail) {
          const allFailed = payments.length > 0 && payments.every(
            (p: any) => p.status === "failed"
          );

          // Mark failed only if we have explicit failure evidence OR it's very old with no payments
          const hasNoActivity = payments.length === 0;

          if (allFailed || hasNoActivity) {
            const failureReason = hasNoActivity
              ? "No payment attempt recorded — order expired"
              : `All ${payments.length} payment attempt(s) failed`;

            const updateResult = await prisma.order.updateMany({
              where: { id: order.id, paymentStatus: "pending" },
              data: { paymentStatus: "failed", failureReason },
            });

            if (updateResult.count > 0) {
              await prisma.paymentLog.create({
                data: {
                  orderId:          order.id,
                  ipAddress:        "cron-reconciliation",
                  razorpayPaymentId: "none",
                  razorpayOrderId:   order.razorpayOrderId,
                  signature:        "cron_verified",
                  status:           "failed",
                  errorMessage:     failureReason,
                  isRetry:          false,
                  attemptCount:     1,
                },
              }).catch((e: any) => console.error("[CRON LOG] PaymentLog write failed:", e));

              sendPaymentFailureEmail(
                order.customerEmail,
                order.customerName,
                order.id,
                order.amount,
                failureReason
              ).catch((e: any) => console.error("[CRON EMAIL] Failure email failed:", e));

              results.failed++;
              console.info(`[CRON EXPIRED] Order ${order.id} marked failed: ${failureReason}`);
            }
          } else {
            // Has some payments but none captured — Razorpay may still be processing
            results.skipped++;
            console.info(
              `[CRON SKIP] Order ${order.id} — ${payments.length} payment(s) in progress, not yet conclusive`
            );
          }
        } else {
          // Not old enough to declare failed — skip for now
          results.skipped++;
        }

      } catch (orderError: any) {
        results.errors++;
        console.error(
          `[CRON ERROR] Failed to reconcile order ${order.id}: ${orderError?.message ?? orderError}`
        );
        // Continue processing remaining orders — one failure must not stop the batch
      }
    }

    const duration = Date.now() - startTime;
    console.info(
      `[CRON DONE] Reconciliation complete in ${duration}ms:`,
      results
    );

    return NextResponse.json({
      success:   true,
      duration:  `${duration}ms`,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error: any) {
    console.error("[CRON FATAL] Reconciliation job crashed:", error?.message ?? error);
    return NextResponse.json(
      { success: false, error: "Cron job failed", details: error?.message },
      { status: 500 }
    );
  }
}
