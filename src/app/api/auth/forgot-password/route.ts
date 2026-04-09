import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResetToken, hashToken } from "@/lib/security";
import { sendResetPasswordEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";

    // Rate limiting to prevent email spam / enumeration
    const { allowed } = rateLimit(`forgot-pw:${ip}`, 3, 15 * 60 * 1000); // 3 per 15 min
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests, try again later" },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // To prevent email enumeration, we should theoretically always return "success"
    // even if the user isn't found. But for dev/admin convenience we might log it.
    if (!user) {
      return NextResponse.json(
        { message: "If that email is in our system, we sent a reset link to it." },
        { status: 200 }
      );
    }

    // Generate secure random token
    const rawToken = generateResetToken();
    // Hash token for database
    const hashedToken = hashToken(rawToken);

    // Dynamic Expiry Logic (15 min for admin, 30 min for normal users)
    const expiresInMinutes = user.role === "admin" ? 15 : 30;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // Save hashed token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: expiresAt,
      },
    });

    // Create the magic link, explicitly removing localhost fallback in production mode
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      if (process.env.NODE_ENV === "production") {
        console.error("[CRITICAL] NEXT_PUBLIC_APP_URL is not set in production. Magic links will fail.");
        return NextResponse.json({ error: "Configuration Error" }, { status: 500 });
      }
      baseUrl = "http://local-development-url.dev";
    }
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    // Send the email (currently mocked)
    await sendResetPasswordEmail(user.email, resetUrl);

    return NextResponse.json(
      { message: "If that email is in our system, we sent a reset link to it." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
