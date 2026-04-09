import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { computeOrderTotal, validateCheckoutFields } from "@/lib/services/orderService";
import { getCurrentUser } from "@/lib/auth";

/**
 * PRODUCTION-GRADE CREATE ORDER API
 *
 * Security features:
 * - Backend price calculation via orderService (NEVER trust frontend)
 * - Lazy Razorpay SDK initialization (fails clearly if env missing)
 * - Rate limiting by IP (50 requests per 5 minutes)
 * - Idempotency key support (prevents duplicate orders on retry)
 * - Order created in DB BEFORE Razorpay (with temp ID), rolled back on failure
 * - Consistent JSON error responses
 */

/**
 * Returns an initialized Razorpay instance or throws with a clear message.
 * Lazy init prevents cold-boot crashes when env vars are missing.
 */
function getRazorpayInstance(): Razorpay {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
  const keySecret = process.env.RAZORPAY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials not configured. Set NEXT_PUBLIC_RAZORPAY_KEY and RAZORPAY_SECRET in .env.local"
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

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

  // VALIDATE AUTHENTICATION: This endpoint is strictly for logged-in users
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please log in to complete checkout." },
      { status: 401 }
    );
  }

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // RATE LIMITING: 50 order creation requests per 5 minutes per IP
  const rateLimitKey = `create-order:${clientIp}`;
  const { allowed } = rateLimit(rateLimitKey, 50, 5 * 60 * 1000);

  if (!allowed) {
    console.warn(`[RATE LIMIT] Order creation rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { success: false, error: "Too many order requests. Please try again later." },
      { status: 429, headers: { "Retry-After": "300" } }
    );
  }

  try {
    // Validate Razorpay is configured EARLY — fail fast with a clear message
    let razorpay: Razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (configError) {
      console.error("[CONFIG ERROR]", configError);
      return NextResponse.json(
        { success: false, error: "Payment gateway not configured. Contact support." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { cartItems, address, paymentMethod, requestId } = body;

    // IDEMPOTENCY: Return existing order if this requestId was already processed
    if (requestId && typeof requestId === "string") {
      const existingOrder = await prisma.order.findFirst({
        where: { requestId },
      });

      if (existingOrder) {
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

    // VALIDATE checkout fields (service layer)
    const checkoutError = validateCheckoutFields(address, paymentMethod);
    if (checkoutError) {
      return NextResponse.json({ success: false, error: checkoutError }, { status: 400 });
    }

    // COMPUTE ORDER TOTAL from DB prices (service layer — never trust frontend)
    let computedOrder;
    try {
      computedOrder = await computeOrderTotal(cartItems);
    } catch (validationError) {
      return NextResponse.json(
        { success: false, error: (validationError as Error).message },
        { status: 400 }
      );
    }

    const { totalAmount, orderItemsData } = computedOrder;

    // CREATE PENDING ORDER IN DATABASE FIRST
    // Order exists before Razorpay is called — ensures no orphaned payments
    let dbOrder;
    try {
      dbOrder = await prisma.order.create({
        data: {
          customerName: user.name, // Force user's actual DB name instead of UI field
          customerEmail: user.email, // Force user's actual DB email
          userId: user.id, // Ensure cryptography-backed ownership
          address: JSON.stringify(address), // Store structured address explicitly as JSON string
          paymentMethod: (paymentMethod as string) || "razorpay",
          amount: totalAmount,
          status: "pending",
          paymentStatus: "pending",
          requestId: requestId ?? null,
          razorpayOrderId: `temp_${Date.now()}`, // Replaced after Razorpay responds
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      console.log(`[ORDER CREATED] Pending DB order ${dbOrder.id}`, {
        amount: totalAmount,
        items: orderItemsData.length,
        ip: clientIp,
      });
    } catch (dbError) {
      console.error("[DB ERROR] Failed to create order:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to create order. Please try again." },
        { status: 500 }
      );
    }

    // CREATE RAZORPAY ORDER
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // Razorpay expects paise
        currency: "INR",
        receipt: dbOrder.id,
        notes: {
          customerName: user.name,
          customerEmail: user.email,
          orderId: dbOrder.id,
        },
      });
      console.log(`[RAZORPAY ORDER] Created ${razorpayOrder.id} for DB order ${dbOrder.id}`);
    } catch (razorpayError) {
      // ROLLBACK: Clean up the pending DB order so it doesn't pollute admin view
      await prisma.order.delete({ where: { id: dbOrder.id } }).catch((e) =>
        console.error("[ROLLBACK ERROR] Could not delete orphaned order:", e)
      );
      console.error("[RAZORPAY ERROR] Order creation failed:", razorpayError);
      return NextResponse.json(
        { success: false, error: "Payment gateway unavailable. Please try again." },
        { status: 503 }
      );
    }

    // UPDATE ORDER WITH ACTUAL RAZORPAY ORDER ID
    await prisma.order.update({
      where: { id: dbOrder.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return NextResponse.json({
      success: true,
      orderId: dbOrder.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  } catch (error) {
    console.error("[UNHANDLED ERROR] create-order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}
