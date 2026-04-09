import crypto from "crypto";

const csrfTokens = new Map<string, { expiresAt: number }>();

export function generateCSRFToken(): string {
  const token = crypto.randomBytes(32).toString("hex");
  csrfTokens.set(token, { expiresAt: Date.now() + 3600000 }); // 1 hour TTL
  return token;
}

/**
 * Validates a CSRF token and CONSUMES it (single-use).
 * Calling this twice with the same token will return false on the second call.
 */
export function validateCSRFToken(token: string): boolean {
  if (!token || typeof token !== "string") return false;

  const entry = csrfTokens.get(token);
  if (!entry) return false;

  // Always delete — expired or not — to prevent replay
  csrfTokens.delete(token);

  if (entry.expiresAt < Date.now()) {
    return false; // Expired
  }

  return true;
}

/**
 * Prune expired tokens from memory (call periodically if needed)
 */
export function cleanupExpiredCSRFTokens(): void {
  const now = Date.now();
  for (const [token, entry] of csrfTokens.entries()) {
    if (entry.expiresAt < now) {
      csrfTokens.delete(token);
    }
  }
}