import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateBody, resetPasswordSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 404 });
  }

  if (record.usedAt) {
    return NextResponse.json({ error: "This reset link has already been used" }, { status: 410 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link has expired" }, { status: 410 });
  }

  const hasExistingPassword =
    !!record.user.passwordHash && !record.user.passwordHash.startsWith("otp:");

  return NextResponse.json({
    email: record.user.email,
    name: record.user.name,
    hasExistingPassword,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const rl = await rateLimit("auth", getClientIp(req));
  if (rl) return rl;

  const { token } = await params;

  const parsed = await validateBody(req, resetPasswordSchema);
  if ("error" in parsed) return parsed.error;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 404 });
  }

  if (record.usedAt) {
    return NextResponse.json({ error: "This reset link has already been used" }, { status: 410 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link has expired" }, { status: 410 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    // Set new password
    prisma.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        // Clicking the email link proves email ownership
        ...(record.user.emailVerified ? {} : { emailVerified: new Date() }),
      },
    }),
    // Mark token as used
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all other unused reset tokens for this user
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { expiresAt: new Date(0) },
    }),
    // Kill all mobile sessions
    prisma.refreshToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);

  return NextResponse.json({ message: "Password has been set. You can now sign in." });
}
