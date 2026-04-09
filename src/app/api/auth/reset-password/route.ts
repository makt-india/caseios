import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken, hashPassword } from "@/lib/security";
import { logAdminAction } from "@/lib/auditLog";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "127.0.0.1";

    // Rate limiting
    const { allowed } = rateLimit(`reset-pw:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many attempts, try again later" },
        { status: 429 }
      );
    }

    // Hash the incoming token
    const incomingHashedToken = hashToken(token);

    // Find user with matching unexpired token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: incomingHashedToken,
        resetTokenExpiry: {
          gt: new Date(), // must be in the future
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const newHashedPassword = await hashPassword(newPassword);

    // Update the password and invalidate the token immediately
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: newHashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      }),
      // Invalidate all existing sessions for this user for security
      prisma.session.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Optional: Log admin password reset
    if (user.role === "admin") {
      await logAdminAction({
        adminEmail: user.email,
        action: "admin_password_reset",
        resourceId: user.id,
        resourceType: "user",
        ipAddress: ip,
        details: { resetTime: new Date() },
      });
    }

    return NextResponse.json(
      { message: "Password has been successfully reset" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
