import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      slug: true,
      logo: true,
      bio: true,
      phone: true,
      email: true,
      website: true,
      coachPhoto: true,
      socialLinks: true,
      specialties: true,
      landingPageEnabled: true,
      certificates: {
        orderBy: { orderIndex: "asc" },
      },
      packages: {
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (!tenant || !tenant.landingPageEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}
