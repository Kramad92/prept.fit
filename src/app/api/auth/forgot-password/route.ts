import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateBody, forgotPasswordSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const rl = await rateLimit("email", getClientIp(req));
  if (rl) return rl;

  const parsed = await validateBody(req, forgotPasswordSchema);
  if ("error" in parsed) return parsed.error;

  const email = parsed.data.email.trim().toLowerCase();

  // Always return same response to prevent email enumeration
  const successResponse = NextResponse.json({
    message: "If an account exists with that email, we've sent a password reset link.",
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return successResponse;

  // Throttle: skip if last token created < 60s ago
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (recentToken && Date.now() - recentToken.createdAt.getTime() < 60_000) {
    return successResponse;
  }

  // Invalidate existing unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { expiresAt: new Date(0) },
  });

  const token = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    await sendPasswordResetEmail({
      to: email,
      name: user.name,
      resetUrl: `${baseUrl}/reset-password/${token}`,
    });
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  return successResponse;
}
