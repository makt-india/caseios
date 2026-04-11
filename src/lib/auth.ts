import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { verifySession } from "./security";

const SESSION_COOKIE_NAME = "caseios_session_token";

/**
 * Returns the currently authenticated user (without password hash), or null.
 *
 * Wrapped with React `cache()` so that multiple calls within the SAME request
 * (root layout, checkout page, admin page, server actions) are deduplicated —
 * only ONE database query is made per request, no matter how many times this
 * is called.
 *
 * Note: `cache()` scope is per-request in Next.js Server Components.
 * It does NOT persist across requests (that is intentional for security).
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session || !session.user) {
    return null;
  }

  // Always strip the password hash before returning to any caller
  const { password, ...userWithoutPassword } = session.user;
  return userWithoutPassword;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    // Import lazily to avoid circular dependency with security.ts
    const { revokeSession } = await import("./security");
    await revokeSession(token);
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
