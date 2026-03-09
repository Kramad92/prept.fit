import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, landingPageSettingsSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: {
      landingPageEnabled: true,
      coachPhoto: true,
      specialties: true,
      socialLinks: true,
    },
  });

  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, landingPageSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      landingPageEnabled: body.landingPageEnabled,
      coachPhoto: body.coachPhoto,
      specialties: body.specialties ?? Prisma.DbNull,
      socialLinks: body.socialLinks ?? Prisma.DbNull,
    },
  });

  return NextResponse.json(tenant);
}
