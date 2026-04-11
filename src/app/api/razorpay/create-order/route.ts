import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { computeOrderTotal, validateCheckoutFields } from "@/lib/services/orderService";
import { getCurrentUser } from "@/lib/auth";

/**
 * ORDER CREATION — PRODUCTION SAFE
 *
 * Fix C4 implemented: The DB order is now created AFTER the Razorpay order is created,
 * so `razorpayOrderId` is always the real ID on first write.
 * This eliminates:
 *   - The temp `razorpayOrderId` unique constraint collision risk
 *   - The race window where a webhook fires before the DB update
 *
 * Flow:
 *   1. Auth + rate limit + validate inputs
 *   2. Idempotency check (requestId already processed?)
 *   3. computeOrderTotal (server-side price, never trust frontend)
 *   4. Create Razorpay order
 *   5. Create DB order atomically with the real razorpayOrderId
 *   6. Return order details to client
 */

function getRazorpayInstance(): Razorpay {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const keySecret = process.env.RAZORPAY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured. Set NEXT_PUBLIC_RAZORPAY_KEY and RAZORPAY_SECRET.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function POST(request: NextRequest) {
  // ── HTTPS in production ──────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    if (request.headers.get("x-forwarded-proto") !== "https") {
      return NextResponse.json({ success: false, error: "HTTPS required" }, { status: 403 });
    }
  }

  // ── Content-Type ─────────────────────────────────────────────────────────
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ success: false, error: "Content-Type must be application/json" }, { status: 400 });
  }

  // ── AUTHENTICATION (required) ─────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized. Please log in to checkout." }, { status: 401 });
  }

  // ── IP + Rate limit ───────────────────────────────────────────────────────
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const { allowed } = rateLimit(`create-order:${clientIp}`, 20, 5 * 60 * 1000);
  if (!allowed) {
    console.warn(`[RATE LIMIT] create-order exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  try {
    // ── Init Razorpay early — fail fast ───────────────────────────────────
    let razorpay: Razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch {
      return NextResponse.json({ success: false, error: "Payment gateway not configured." }, { status: 500 });
    }

    const body = await request.json();
    const { cartItems, address, paymentMethod, requestId } = body;

    // ── IDEMPOTENCY: requestId already processed → return existing result ──
    if (requestId && typeof requestId === "string" && requestId.trim()) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          requestId: requestId.trim(),
          userId: user.id, // SECURITY: scope to this user's orders only
        },
        select: { id: true, razorpayOrderId: true, amount: true },
      });

      if (existingOrder && !existingOrder.razorpayOrderId.startsWith("PENDING_")) {
        console.log(`[IDEMPOTENT] Returning existing order for requestId: ${requestId}`);
        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          razorpayOrderId: existingOrder.razorpayOrderId,
          amount: Math.round(existingOrder.amount * 100),
          currency: "INR",
          message: "Order already created (idempotent)",
        });
      }
    }

    // ── Validate checkout fields ───────────────────────────────────────────
    const checkoutError = validateCheckoutFields(address, paymentMethod);
    if (checkoutError) {
      return NextResponse.json({ success: false, error: checkoutError }, { status: 400 });
    }

    // ── Server-side price computation (NEVER trust frontend amounts) ───────
    let computedOrder: Awaited<ReturnType<typeof computeOrderTotal>>;
    try {
      computedOrder = await computeOrderTotal(cartItems);
    } catch (validationError) {
      return NextResponse.json(
        { success: false, error: (validationError as Error).message },
        { status: 400 }
      );
    }

    const { totalAmount, orderItemsData } = computedOrder;

    // ── FIX C4: Create Razorpay order FIRST, then store in DB ────────────
    // Reason: razorpayOrderId has a @unique constraint. Creating DB order
    // first with a temp ID risks constraint collisions and a race condition
    // where the webhook fires before the DB update replaces the temp ID.
    let razorpayOrder: { id: string; amount: string | number; currency: string };
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`, // receipt ≠ our internal orderId (set in notes below)
        notes: {
          customerName: user.name,
          customerEmail: user.email,
          userId: user.id,
        },
      });
      console.log(`[RAZORPAY ORDER] Created: ${razorpayOrder.id} for user ${user.id} — ₹${totalAmount}`);
    } catch (razorpayError) {
      console.error("[RAZORPAY] Order creation failed:", razorpayError);
      return NextResponse.json(
        { success: false, error: "Payment gateway unavailable. Please try again." },
        { status: 503 }
      );
    }

    // ── Create DB order with REAL razorpayOrderId (atomic, single write) ──
    let dbOrder: { id: string };
    try {
      dbOrder = await prisma.order.create({
        data: {
          customerName: user.name,           // from auth, never from frontend
          customerEmail: user.email,         // from auth, never from frontend
          userId: user.id,
          address: JSON.stringify(address),
          paymentMethod: paymentMethod as string,
          amount: totalAmount,               // server-calculated total
          status: "pending",
          paymentStatus: "pending",
          requestId: requestId?.trim() ?? null,
          razorpayOrderId: razorpayOrder.id, // real ID, no temp placeholder
          items: { create: orderItemsData }, // price snapshot at purchase time
        },
        select: { id: true },
      });

      // Now that we have our internal order ID, patch the Razorpay order notes
      // so webhooks can map razorpay order → our DB order.
      // This is fire-and-forget (non-critical path).
      razorpay.orders.edit(razorpayOrder.id, {
        notes: {
          customerName: user.name,
          customerEmail: user.email,
          userId: user.id,
          orderId: dbOrder.id, // inject our internal ID into notes
        },
      } as any).catch((e: any) =>
        console.warn("[RAZORPAY] Could not patch order notes with orderId:", e?.message)
      );

      console.log(`[ORDER CREATED] DB order ${dbOrder.id} → Razorpay ${razorpayOrder.id}`, {
        amount: totalAmount,
        items: orderItemsData.length,
        userId: user.id,
        ip: clientIp,
      });
    } catch (dbError) {
      console.error("[DB] Failed to create order after Razorpay order was created:", dbError);
      // DB write failed AFTER Razorpay order was created — this is an orphaned Razorpay order.
      // Log it prominently so it can be reconciled manually.
      console.error(`[ORPHANED RAZORPAY ORDER] ${razorpayOrder.id} — must be cancelled or refunded manually`);
      return NextResponse.json(
        { success: false, error: "Failed to save order. Please contact support with your order reference." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: dbOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,       // authoritative amount in paise from Razorpay
      currency: razorpayOrder.currency,
    });

  } catch (error) {
    console.error("[UNHANDLED ERROR] create-order:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
