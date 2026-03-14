import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// GET: Validate token and return client/tenant info for the setup page
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token },
    include: {
      client: {
        include: { tenant: { select: { name: true, brandColor: true } } },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json(
      { error: "This invite has already been used" },
      { status: 410 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invite link has expired. Ask your coach to send a new one." },
      { status: 410 }
    );
  }

  if (invite.client.userId) {
    return NextResponse.json(
      { error: "Account already set up" },
      { status: 409 }
    );
  }

  // Check if a user account already exists with this email (multi-coach scenario)
  const existingUser = invite.client.email
    ? await prisma.user.findUnique({ where: { email: invite.client.email } })
    : null;

  return NextResponse.json({
    clientName: invite.client.name,
    email: invite.client.email,
    businessName: invite.client.tenant.name,
    brandColor: invite.client.tenant.brandColor,
    hasExistingAccount: !!existingUser,
  });
}

// POST: Accept invite — set password and create user account
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token },
    include: { client: true },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.usedAt) {
    return NextResponse.json(
      { error: "This invite has already been used" },
      { status: 410 }
    );
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This invite link has expired. Ask your coach to send a new one." },
      { status: 410 }
    );
  }

  if (invite.client.userId) {
    return NextResponse.json(
      { error: "Account already set up" },
      { status: 409 }
    );
  }

  // Check if user already exists with this email (multi-coach scenario)
  const existingUser = invite.client.email
    ? await prisma.user.findUnique({ where: { email: invite.client.email } })
    : null;

  if (existingUser) {
    // Only allow linking if existing user is a CLIENT
    if (existingUser.role !== "CLIENT") {
      return NextResponse.json(
        { error: "An account with this email already exists with a different role" },
        { status: 409 }
      );
    }

    // Link existing user to this client profile + mark invite used
    await prisma.$transaction([
      prisma.client.update({
        where: { id: invite.client.id },
        data: { userId: existingUser.id },
      }),
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      { message: "Coach added to your account. You can switch coaches in your portal." },
      { status: 201 }
    );
  }

  // New user — require password
  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { password } = body;
  if (!password || typeof password !== "string" || password.length < 10) {
    return NextResponse.json(
      { error: "Password must be at least 10 characters" },
      { status: 400 }
    );
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password must contain at least one letter and one number" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user + link to client + mark token used in a transaction
  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: invite.client.email!,
        name: invite.client.name,
        passwordHash,
        role: "CLIENT",
        tenantId: invite.client.tenantId,
      },
    });
    await tx.client.update({
      where: { id: invite.client.id },
      data: { userId: newUser.id },
    });
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  });

  return NextResponse.json(
    { message: "Account created. You can now sign in." },
    { status: 201 }
  );
}
