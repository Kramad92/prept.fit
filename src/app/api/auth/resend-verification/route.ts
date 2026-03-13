import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await rateLimit("email", getClientIp(req));
  if (rl) return rl;
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const successResponse = NextResponse.json({
    message: "If that email exists, a verification link has been sent.",
  });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified || user.role !== "COACH") {
    return successResponse;
  }

  // Rate limit: check if last token was created less than 60s ago
  const recentToken = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (recentToken && Date.now() - recentToken.createdAt.getTime() < 60_000) {
    return successResponse;
  }

  // Invalidate existing tokens
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { expiresAt: new Date(0) },
  });

  const token = randomBytes(32).toString("hex");

  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    await sendVerificationEmail({
      to: email,
      name: user.name,
      verificationUrl: `${baseUrl}/verify-email/${token}`,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return successResponse;
}
