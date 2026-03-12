import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody } from "@/lib/validations";

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]),
});

const unregisterSchema = z.object({
  token: z.string().min(1),
});

// Register push token
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const validated = await validateBody(req, registerSchema);
  if ("error" in validated) return validated.error;
  const { data } = validated;

  // Upsert by token — handles reinstall/re-login, reassigns to current user
  await prisma.pushToken.upsert({
    where: { token: data.token },
    update: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      platform: data.platform,
    },
    create: {
      token: data.token,
      platform: data.platform,
      userId: session.user.id,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json({ success: true });
}

// Unregister push token (on logout)
// Accepts optional { token } in body. If no body/token, removes all tokens for the user.
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let token: string | undefined;
  try {
    const body = await req.json();
    token = body?.token;
  } catch {
    // No body — that's fine, delete all
  }

  if (token) {
    await prisma.pushToken.deleteMany({
      where: { token, userId: session.user.id },
    });
  } else {
    // Delete all tokens for this user (full logout)
    await prisma.pushToken.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ success: true });
}
