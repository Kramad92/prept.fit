import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid verification link" }, { status: 404 });
  }

  if (record.usedAt) {
    return NextResponse.json({ error: "This email has already been verified" }, { status: 410 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link has expired" }, { status: 410 });
  }

  if (record.user.emailVerified) {
    return NextResponse.json({ error: "This email has already been verified" }, { status: 410 });
  }

  return NextResponse.json({
    email: record.user.email,
    name: record.user.name,
  });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Invalid verification link" }, { status: 404 });
  }

  if (record.usedAt || record.user.emailVerified) {
    return NextResponse.json({ error: "This email has already been verified" }, { status: 410 });
  }

  if (record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This verification link has expired" }, { status: 410 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Email verified. You can now sign in." });
}
