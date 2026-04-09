import type { NextConfig } from "next";

// Validate critical environment variables at startup
function validateEnvironment() {
  const required = [
    "NEXT_PUBLIC_RAZORPAY_KEY",
    "RAZORPAY_SECRET",
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD_HASH",
    "DATABASE_URL",
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`[WARNING] Missing required environment variables: ${missing.join(", ")}`);
    console.warn(`Ensure these are set in your Cloudflare Pages dashboard before accessing the app.`);
    // We intentionally don't throw an Error here so Cloudflare can successfully complete the build step.
    // Individual API routes check for these dynamically at runtime.
  }
}

validateEnvironment();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
