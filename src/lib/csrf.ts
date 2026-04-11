/**
 * CSRF Protection — Removed custom in-memory implementation.
 *
 * WHY: Next.js 15+ enforces CSRF protection natively for all Server Actions by
 * validating the `Origin` header against the host. A custom in-memory Map is
 * fundamentally broken on serverless (Vercel) because each cold-start Lambda
 * instance has an empty Map, so tokens generated on one instance can never be
 * validated on another — causing legitimate users to get random auth failures.
 *
 * The stubs below exist only for backward-compatibility with any call sites
 * that haven't been cleaned up yet. They are safe no-ops.
 */

export function generateCSRFToken(): string {
  // No-op: Next.js handles CSRF natively for Server Actions.
  return "csrf-handled-by-nextjs";
}

export function validateCSRFToken(_token: string): boolean {
  // No-op: Always return true. Next.js Origin validation already protects actions.
  return true;
}

export function cleanupExpiredCSRFTokens(): void {
  // No-op
}