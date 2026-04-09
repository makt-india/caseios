/**
 * Order Service — Business Logic Layer
 *
 * Centralizes all order-related calculations and validations.
 * API routes import from here to stay thin; logic is testable in isolation.
 */

import { prisma } from "@/lib/db";

export interface CartItemInput {
  id: string;
  quantity: number;
}

export interface OrderItemData {
  productId: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface ComputedOrder {
  totalAmount: number;
  orderItemsData: OrderItemData[];
}

/** Maximum allowed order value in INR */
export const MAX_ORDER_AMOUNT = 100_000;

/** Maximum items allowed per cart */
export const MAX_CART_ITEMS = 100;

/** Maximum quantity per single item */
export const MAX_ITEM_QUANTITY = 1_000;

/**
 * Fetches product prices from DB and computes the server-authoritative
 * order total. NEVER trust prices sent from the frontend.
 *
 * @throws Error with a user-facing message on any validation failure.
 */
export async function computeOrderTotal(
  cartItems: CartItemInput[]
): Promise<ComputedOrder> {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Cart cannot be empty");
  }

  if (cartItems.length > MAX_CART_ITEMS) {
    throw new Error(`Cart exceeds maximum item limit (${MAX_CART_ITEMS})`);
  }

  // Validate cart item structure before hitting DB
  for (const item of cartItems) {
    if (!item.id || typeof item.id !== "string" || !item.id.trim()) {
      throw new Error("Invalid cart item: missing product ID");
    }
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QUANTITY) {
      throw new Error(`Invalid quantity for item ${item.id}. Must be 1–${MAX_ITEM_QUANTITY}.`);
    }
  }

  // Deduplicate product IDs (safety net)
  const uniqueProductIds = [...new Set(cartItems.map((i) => i.id))];

  // CRITICAL: Fetch authoritative prices from database
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, price: true, name: true },
  });

  // Check every requested product actually exists
  if (products.length !== uniqueProductIds.length) {
    const foundIds = new Set(products.map((p) => p.id));
    const missing = uniqueProductIds.filter((id) => !foundIds.has(id));
    throw new Error(`Product(s) not found: ${missing.join(", ")}`);
  }

  const priceMap = new Map(products.map((p) => [p.id, p.price]));

  let totalAmount = 0;
  const orderItemsData: OrderItemData[] = [];

  for (const item of cartItems) {
    // Merge quantities if same product appears multiple times in cart
    const price = priceMap.get(item.id)!;
    totalAmount += price * item.quantity;
    orderItemsData.push({
      productId: item.id,
      quantity: item.quantity,
      priceAtPurchase: price,
    });
  }

  if (totalAmount <= 0) {
    throw new Error("Order total must be greater than ₹0");
  }

  if (totalAmount > MAX_ORDER_AMOUNT) {
    throw new Error(
      `Order total ₹${totalAmount.toLocaleString("en-IN")} exceeds the ₹${MAX_ORDER_AMOUNT.toLocaleString("en-IN")} limit. Please split your order.`
    );
  }

  return { totalAmount, orderItemsData };
}

export interface IndianAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
}

/**
 * Validates all customer-provided fields from the checkout form.
 * Returns an error message string or null if all valid.
 */
export function validateCheckoutFields(
  address: unknown,
  paymentMethod: unknown
): string | null {
  if (
    !address ||
    typeof address !== "object" ||
    Array.isArray(address)
  ) {
    return "Structured address object required";
  }

  const addr = address as IndianAddress;

  // 1. Mandatory Fields Presence
  const requiredFields: (keyof IndianAddress)[] = ["name", "phone", "addressLine1", "state", "district", "city", "pincode"];
  for (const field of requiredFields) {
    if (!addr[field] || typeof addr[field] !== "string" || !addr[field].trim()) {
      return `${field} is required and cannot be empty`;
    }
  }

  // 2. Name Validation
  if (addr.name.length < 2 || addr.name.length > 100) {
    return "Name must be between 2 and 100 characters";
  }

  // 3. Indian Phone Validation (10 digits)
  const phoneClean = addr.phone.replace(/\D/g, "");
  if (phoneClean.length !== 10) {
    return "Valid 10-digit Indian phone number is required";
  }

  // 4. Indian Pincode Validation (6 digits)
  const pincodeClean = addr.pincode.replace(/\D/g, "");
  if (pincodeClean.length !== 6) {
    return "Valid 6-digit Indian pincode is required";
  }

  // 5. Address Lines
  if (addr.addressLine1.length > 255) {
    return "Address line 1 is too long (max 255)";
  }
  if (addr.addressLine2 && addr.addressLine2.length > 255) {
    return "Address line 2 is too long (max 255)";
  }

  // 6. State & City
  if (addr.state.length > 100 || addr.city.length > 100 || addr.district.length > 100) {
    return "State, District, or City name is too long";
  }

  // Payment Method Validation
  if (typeof paymentMethod !== "string" || !["card", "upi", "razorpay"].includes(paymentMethod)) {
    return "Valid payment method required";
  }

  return null; // All valid
}
