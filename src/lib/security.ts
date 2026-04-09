import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { prisma } from "./db";

/**
 * Generate a cryptographically secure token (used for sessions and reset links)
 * @returns 32-byte hex string (256-bit security)
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Generate a secure token for password reset links
 */
export function generateResetToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token for secure database storage (prevents token theft from DB)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create a new user session in the database
 * @param token - Session token
 * @param userId - User ID
 * @param ipAddress - Client IP address
 * @returns Session object or null if creation fails
 */
export async function createUserSession(
  token: string,
  userId: string,
  ipAddress: string
) {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return await prisma.session.create({
      data: {
        token,
        userId,
        ipAddress,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("[ERROR] Failed to create session:", error);
    return null;
  }
}

/**
 * Verify and retrieve session and user from database
 * @param token - Session token to verify
 * @returns { session, user } object if valid, null if expired or not found
 */
export async function verifySession(token: string) {
  try {
    // Check if token exists, is not expired, and get user
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    return session;
  } catch (error) {
    console.error("[ERROR] Failed to verify session:", error);
    return null;
  }
}

/**
 * Invalidate/revoke a session (logout)
 * @param token - Session token to revoke
 */
export async function revokeSession(token: string) {
  try {
    await prisma.session.delete({
      where: { token },
    });
  } catch (error) {
    console.error("[ERROR] Failed to revoke session:", error);
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`[CLEANUP] Deleted ${result.count} expired sessions`);
  } catch (error) {
    console.error("[ERROR] Failed to cleanup expired sessions:", error);
  }
}

/**
 * Hash password using bcrypt
 * Safe for storing in database or environment
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcrypt");
  const saltRounds = 12; // OWASP recommended
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(password, hash);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    if (bufA.length !== bufB.length) {
      return false;
    }

    return timingSafeEqual(bufA, bufB);
  } catch (error) {
    return false;
  }
}
