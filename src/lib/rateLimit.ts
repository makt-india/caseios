/**
 * Production-grade rate limiter with sliding window algorithm
 * Uses in-memory storage with automatic cleanup for stateless deployments
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Sliding window rate limiter
 * @param key - Unique identifier (IP address, user ID, email, etc.)
 * @param limit - Max requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up expired entries
  if (entry && entry.resetTime <= now) {
    rateLimitStore.delete(key);
  }

  // Get or create entry
  const current = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

  // Check if request is allowed
  const allowed = current.count < limit;

  if (allowed) {
    current.count++;
    rateLimitStore.set(key, current);
  }

  // Calculate remaining requests
  const remaining = Math.max(0, limit - current.count);
  const resetTime = current.resetTime;

  return { allowed, remaining, resetTime };
}

/**
 * Rate limit status for a key
 */
export function getRateLimitStatus(
  key: string,
  limit: number,
  windowMs: number
): { count: number; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime <= now) {
    return { count: 0, remaining: limit, resetTime: now + windowMs };
  }

  return {
    count: entry.count,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Clear a rate limit entry (e.g., after successful authentication)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clean up all expired entries
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
setInterval(() => {
  cleanupExpiredEntries();
}, 5 * 60 * 1000);
