import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Coach invites a client by creating a user account linked to their client profile
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  if (existingUser) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const body = await req.json();
  const tempPassword = body.password || "changeme123";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: client.email,
      name: client.name,
      passwordHash,
      role: "CLIENT",
      tenantId: session.user.tenantId,
      clientProfile: { connect: { id: client.id } },
    },
  });

  return NextResponse.json(
    {
      userId: user.id,
      email: user.email,
      tempPassword,
      message: "Client portal access created. Share the temporary password with your client.",
    },
    { status: 201 }
  );
}
