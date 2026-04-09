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
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

validateEnvironment();

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
