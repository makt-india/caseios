// Type definitions for the application

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
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

export type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentStatus: string; // Allow string for Prisma compatibility
  status: string; // Allow string
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
  address: string; // Required field
  paymentMethod: string; // Required field
};

export type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  createdAt: Date;
};