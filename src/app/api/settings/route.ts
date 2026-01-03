import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });

  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      name: body.name,
      bio: body.bio || null,
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      brandColor: body.brandColor,
      timezone: body.timezone,
    },
  });

  return NextResponse.json(tenant);
}
