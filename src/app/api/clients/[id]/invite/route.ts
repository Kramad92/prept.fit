import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { sendInviteEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

// Coach invites a client — email invite (primary) or temp password (secondary)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit email sending per tenant
  const rl = await rateLimit("email", session.user.tenantId);
  if (rl) return rl;

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (client.userId) {
    return NextResponse.json(
      { error: "Client already has portal access" },
      { status: 409 }
    );
  }

  if (!client.email) {
    return NextResponse.json(
      { error: "Client must have an email address" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: client.email },
  });

  const body = await req.json();
  const method = body.method || "email"; // "email" or "password"

  if (method === "password") {
    if (existingUser) {
      // Multi-coach: link existing user to this client
      if (existingUser.role !== "CLIENT") {
        return NextResponse.json(
          { error: "A user with this email already exists with a different role" },
          { status: 409 }
        );
      }
      await prisma.client.update({
        where: { id: client.id },
        data: { userId: existingUser.id },
      });
      return NextResponse.json(
        {
          method: "password",
          message: "Client already has a portal account. They have been linked to your account.",
        },
        { status: 201 }
      );
    }

    // New user: create account with temp password
    const tempPassword = body.password || crypto.randomBytes(16).toString("base64url");
    if (tempPassword.length < 10) {
      return NextResponse.json({ error: "Password must be at least 10 characters" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const newUser = await prisma.user.create({
      data: {
        email: client.email,
        name: client.name,
        passwordHash,
        role: "CLIENT",
        tenantId: session.user.tenantId,
      },
    });
    await prisma.client.update({
      where: { id: client.id },
      data: { userId: newUser.id },
    });

    return NextResponse.json(
      {
        method: "password",
        tempPassword,
        message: "Portal access created. Share the temporary password with your client.",
      },
      { status: 201 }
    );
  }

  // Primary: send email invite
  // Invalidate any existing tokens for this client
  await prisma.inviteToken.updateMany({
    where: { clientId: client.id, usedAt: null },
    data: { expiresAt: new Date(0) },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  await prisma.inviteToken.create({
    data: {
      token,
      clientId: client.id,
      expiresAt,
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });

  const appUrl = process.env.NEXTAUTH_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const inviteUrl = `${appUrl}/invite/${token}`;

  try {
    await sendInviteEmail({
      to: client.email,
      clientName: client.name,
      coachName: session.user.name || "Your coach",
      businessName: tenant?.name || "Prept",
      inviteUrl,
    });
  } catch (error) {
    console.error("[POST /api/clients/[id]/invite]", error);
    // Clean up the token if email fails
    await prisma.inviteToken.deleteMany({ where: { token } });
    return NextResponse.json(
      { error: "Failed to send invite email. Check email configuration." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      method: "email",
      message: `Invite email sent to ${client.email}`,
    },
    { status: 201 }
  );
}
