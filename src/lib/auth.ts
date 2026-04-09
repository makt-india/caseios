import { cookies } from "next/headers";
import { prisma } from "./db";
import { verifySession, verifyPassword, createUserSession, revokeSession } from "./security";
import { getClientIp } from "@/app/actions"; // We'll extract this helper later if needed

const SESSION_COOKIE_NAME = "casios_session_token";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySession(token);

  if (!session || !session.user) {
    return null;
  }

  // Ensure security by returning the user WITHOUT the password hash
  const { password, ...userWithoutPassword } = session.user;
  return userWithoutPassword;
}

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
    await revokeSession(token);
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}
