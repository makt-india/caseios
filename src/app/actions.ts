"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit, clearRateLimit } from "@/lib/rateLimit";
import { logAdminAction } from "@/lib/auditLog";
import { validateCSRFToken } from "@/lib/csrf";
import { isValidImageUrl } from "@/lib/validation";
import { hashPassword, verifyPassword, generateSessionToken } from "@/lib/security";
import { getCurrentUser, logoutUser as libLogoutUser, requireAdmin } from "@/lib/auth";
// ========================
// INTERNAL HELPERS
// ========================

/**
 * Extracts the client IP from request headers.
 * Deduplicates the same 6-line block that used to exist across every action.
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Returns the email of the currently logged-in user, or "unknown".
 */
export async function getAdminEmail(): Promise<string> {
  const user = await getCurrentUser();
  return user ? user.email : "unknown";
}

/**
 * Capture detailed session metadata (IP and User Agent)
 */
export async function getSessionMetadata(): Promise<{ ip: string; ua: string }> {
  const ip = await getClientIp();
  const headersList = await headers();
  const ua = headersList.get("user-agent") || "unknown";
  return { ip, ua };
}

/**
 * Logs an administrative action to the database.
 */
async function logToAdminLog(action: string, details?: any) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return;

  const { ip, ua } = await getSessionMetadata();

  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action,
      ip,
      userAgent: ua,
      details: details ? JSON.stringify(details) : null,
    },
  });
}

// ========================
// USER AUTHENTICATION
// ========================

async function seedAdminIfMissing() {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminPassHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminPassHash) return;

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "CASIOS Admin",
        email: adminEmail,
        password: adminPassHash,
        role: "admin",
      },
    });
  }
}

export async function loginUser(prevState: any, formData: FormData) {
  const csrfToken = formData.get("_csrf") as string;
  if (!validateCSRFToken(csrfToken)) {
    return { error: "Invalid or expired session. Please refresh and try again." };
  }

  // Automatically seed the admin from env directly into DB
  await seedAdminIfMissing();

  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password required." };

  const rateLimitKey = `login:${email}`;
  const { allowed } = rateLimit(rateLimitKey, 5, 5 * 60 * 1000);
  if (!allowed) return { error: "Too many attempts. Please try again in 5 minutes." };

  const user = await prisma.user.findUnique({ where: { email } });
  let passwordMatches = false;

  if (user && password) {
    try {
      passwordMatches = await verifyPassword(password, user.password);
    } catch (error) {
      console.error("[ERROR] Password verification failed:", error);
    }
  }

  if (!user || !passwordMatches) {
    return { error: "Invalid email or password." };
  }

  clearRateLimit(rateLimitKey);

  const sessionToken = generateSessionToken();
  const ipAddress = await getClientIp();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { token: sessionToken, userId: user.id, ipAddress, expiresAt },
  });

  (await cookies()).set({
    name: "casios_session_token",
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  // LOG LOGIN EVENT
  const { ip, ua } = await getSessionMetadata();
  await prisma.adminLog.create({
    data: {
      adminId: user.id,
      action: "login",
      ip,
      userAgent: ua,
    },
  });

  // Redirect based on role
  revalidatePath("/");
  if (user.role === "admin") {
    redirect("/admin");
  } else {
    redirect("/checkout");
  }
}

export async function registerUser(prevState: any, formData: FormData) {
  const csrfToken = formData.get("_csrf") as string;
  if (!validateCSRFToken(csrfToken)) {
    return { error: "Invalid or expired session. Please refresh and try again." };
  }

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.toLowerCase().trim();
  const password = formData.get("password") as string;

  if (!name || !email || !password) return { error: "All fields are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters long." };

  const rateLimitKey = `register:${await getClientIp()}`;
  const { allowed } = rateLimit(rateLimitKey, 5, 60 * 60 * 1000); // 5 per hour per IP
  if (!allowed) return { error: "Registration rate limit exceeded. Try again later." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { error: "An account with this email already exists." };

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "user",
    },
  });

  // Auto-login after registration
  const sessionToken = generateSessionToken();
  const ipAddress = await getClientIp();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  await prisma.session.create({
    data: { token: sessionToken, userId: user.id, ipAddress, expiresAt },
  });

  (await cookies()).set({
    name: "casios_session_token",
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  revalidatePath("/");
  redirect("/checkout");
}

export async function adminLogout() {
  const user = await getCurrentUser();
  if (user) {
    const { ip, ua } = await getSessionMetadata();
    await prisma.adminLog.create({
      data: { adminId: user.id, action: "logout", ip, userAgent: ua },
    });
  }
  await libLogoutUser();
  revalidatePath("/admin");
  redirect("/login");
}

export async function verifyAdminSessionValid(token?: string): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

// ========================
// PRODUCT MANAGEMENT
// ========================

export async function getProducts() {
  return await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function addProduct(formData: FormData) {
  await requireAdmin();
  
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const price = parseFloat(formData.get("price") as string);
  const category = formData.get("category") as string;
  const image = formData.get("image") as string;

  if (!name?.trim() || name.length > 255) {
    throw new Error("Product name required (max 255 chars)");
  }
  if (!description?.trim() || description.length > 5000) {
    throw new Error("Product description required (max 5000 chars)");
  }
  if (!category?.trim() || category.length > 100) {
    throw new Error("Product category required (max 100 chars)");
  }
  if (isNaN(price) || price <= 0 || price > 1_000_000) {
    throw new Error("Invalid price (must be between ₹1 and ₹10,00,000)");
  }
  if (!image?.trim() || image.length > 500) {
    throw new Error("Product image URL required (max 500 chars)");
  }
  if (!isValidImageUrl(image)) {
    throw new Error("Invalid image URL — must be a local path or HTTPS from an allowed domain");
  }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      price,
      category: category.trim(),
      image: image.trim(),
    },
  });

  await logToAdminLog("add_product", { productId: product.id, name: product.name });

  await logAdminAction({
    adminEmail: await getAdminEmail(),
    action: "add_product",
    resourceId: product.id,
    resourceType: "product",
    ipAddress: await getClientIp(),
    details: { productName: name, category, price },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  if (!id?.trim()) {
    throw new Error("Product ID required");
  }

  // Guard: throw clearly if product doesn't exist instead of letting Prisma throw a cryptic error
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new Error(`Product ${id} not found`);
  }

  await prisma.product.delete({ where: { id } });

  await logToAdminLog("delete_product", { productId: id, name: product.name });

  await logAdminAction({
    adminEmail: await getAdminEmail(),
    action: "delete_product",
    resourceId: id,
    resourceType: "product",
    ipAddress: await getClientIp(),
    details: { productName: product.name, productPrice: product.price },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

// ========================
// ORDER MANAGEMENT
// ========================

/**
 * Returns orders with optional filtering.
 * Supports filtering by paymentStatus and/or status for admin panel views.
 * Fetches paginated results to avoid loading the full table on every request.
 */
export async function getOrders(
  filter?: {
    paymentStatus?: "pending" | "completed" | "failed";
    status?: "pending" | "paid" | "shipped" | "completed";
    search?: string; // matches customerName or customerEmail
  },
  limit = 200
) {
  await requireAdmin();
  return await prisma.order.findMany({
    where: {
      ...(filter?.paymentStatus && { paymentStatus: filter.paymentStatus }),
      ...(filter?.status && { status: filter.status }),
      ...(filter?.search && {
        OR: [
          { customerName: { contains: filter.search } },
          { customerEmail: { contains: filter.search } },
        ],
      }),
    },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Returns total revenue from COMPLETED payments only.
 * Excludes pending and failed orders from the revenue figure.
 */
export async function getCompletedRevenue(): Promise<number> {
  await requireAdmin();
  const result = await prisma.order.aggregate({
    where: { paymentStatus: "completed" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getOrderById(id: string) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Order ID required");
  return await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      paymentLogs: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function getPaymentLogs(orderId: string) {
  await requireAdmin();
  if (!orderId?.trim()) throw new Error("Order ID required");
  return await prisma.paymentLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteOrder(id: string) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Order ID required");

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) throw new Error(`Order ${id} not found`);

  await prisma.order.delete({ where: { id } });

  await logToAdminLog("delete_order", { orderId: id, amount: order.amount });

  await logAdminAction({
    adminEmail: await getAdminEmail(),
    action: "delete_order",
    resourceId: id,
    resourceType: "order",
    ipAddress: await getClientIp(),
    details: {
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: order.amount,
      paymentStatus: order.paymentStatus,
    },
  });

  revalidatePath("/admin");
}

/**
 * Manually update order status (admin intervention).
 */
export async function updateOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "shipped" | "completed",
  paymentStatus?: "pending" | "completed" | "failed"
) {
  await requireAdmin();
  if (!orderId?.trim()) throw new Error("Order ID required");

  const validStatuses = ["pending", "paid", "shipped", "completed"];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const validPaymentStatuses = ["pending", "completed", "failed"];
  if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(paymentStatus && { paymentStatus }),
    },
  });

  await logToAdminLog("update_order_status", { orderId, status, paymentStatus });

  await logAdminAction({
    adminEmail: await getAdminEmail(),
    action: "update_order_status",
    resourceId: orderId,
    resourceType: "order",
    ipAddress: await getClientIp(),
    details: { status, paymentStatus },
  });

  revalidatePath("/admin");
}

// ========================
// CONTACT LEADS
// ========================

export async function submitContactMessage(formData: FormData) {
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const email = formData.get("email") as string;
  const message = formData.get("message") as string;

  if (!firstName?.trim() || firstName.length > 255)
    throw new Error("First name required (max 255 chars)");
  if (!lastName?.trim() || lastName.length > 255)
    throw new Error("Last name required (max 255 chars)");
  if (!email?.trim() || email.length > 255)
    throw new Error("Email required (max 255 chars)");
  if (!message?.trim() || message.length > 5000)
    throw new Error("Message required (max 5000 chars)");

  await prisma.contactMessage.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    },
  });

  revalidatePath("/admin");
}

export async function getContactLeads() {
  await requireAdmin();
  return await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteContactMessage(id: string) {
  await requireAdmin();
  if (!id?.trim()) throw new Error("Message ID required");

  await prisma.contactMessage.delete({ where: { id } });

  revalidatePath("/admin");
}

// ========================
// UTILITIES
// ========================

export async function getProductById(id: string) {
  if (!id?.trim()) throw new Error("Product ID required");
  return await prisma.product.findUnique({ where: { id } });
}

export async function getMyOrders() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  return await prisma.order.findMany({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function logoutUserAction() {
  await libLogoutUser();
  revalidatePath("/");
  redirect("/login");
}

// ========================
// ADMIN AUDIT & SECURITY
// ========================

export async function getAdminLogs(limit = 100) {
  await requireAdmin();
  return await prisma.adminLog.findMany({
    include: { admin: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAdminSessions(limit = 50) {
  await requireAdmin();
  return await prisma.session.findMany({
    where: { user: { role: "admin" } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

