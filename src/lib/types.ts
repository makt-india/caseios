// Type definitions for the application

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description?: string; // Optional — not selected in list queries, only in detail view
  createdAt: Date;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  product: Product;
  quantity: number;
  priceAtPurchase: number;
};

/**
 * Order as returned by getOrders() (admin list view).
 * Uses _count instead of full items array to avoid N+1 joins.
 */
export type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  address: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: Date;
  _count: { items: number };
};

/**
 * Order with full items — only fetched in detail/single-order view.
 */
export type OrderDetail = {
  id: string;
  customerName: string;
  customerEmail: string;
  address: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paymentStatus: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: OrderItem[];
};

export type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt: Date;
};