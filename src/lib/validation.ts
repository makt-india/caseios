// Input validation utilities

/**
 * Validates an image URL for security.
 * Allows: local relative paths starting with "/" and HTTPS URLs from allowed domains.
 * Rejects: HTTP, data:, javascript:, and unknown external domains.
 *
 * IMPORTANT: new URL() throws on relative paths — always check for "/" first.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  // Allow local relative paths (e.g., /images/hero.png, /public/img.jpg)
  // Must check BEFORE calling new URL(), which throws on relative strings.
  if (url.startsWith("/") && !url.startsWith("//")) return true;

  try {
    const parsed = new URL(url);

    // Only allow HTTPS for external URLs
    if (parsed.protocol !== "https:") return false;

    const hostname = parsed.hostname;

    // Whitelist of allowed external image domains
    const allowedDomains = [
      "yourdomain.com",
      "cdn.yourdomain.com",
      "images.unsplash.com",
      "res.cloudinary.com",
      "img.icons8.com",
      "lh3.googleusercontent.com",  // Google avatars
    ];

    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    // new URL() threw — not a valid absolute URL
    return false;
  }
}