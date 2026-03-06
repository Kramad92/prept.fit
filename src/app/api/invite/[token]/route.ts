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

  return NextResponse.json({
    clientName: invite.client.name,
    email: invite.client.email,
    businessName: invite.client.tenant.name,
    brandColor: invite.client.tenant.brandColor,
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

  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create user + link to client + mark token used in a transaction
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.client.email!,
        name: invite.client.name,
        passwordHash,
        role: "CLIENT",
        tenantId: invite.client.tenantId,
        clientProfile: { connect: { id: invite.client.id } },
      },
    }),
    prisma.inviteToken.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json(
    { message: "Account created. You can now sign in." },
    { status: 201 }
  );
}
