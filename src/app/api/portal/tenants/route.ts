import { NextResponse } from "next/server";
import { requireClient } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET: List all tenants (coaches) this client belongs to
export async function GET() {
  const session = await requireClient();

  const clientProfiles = await prisma.client.findMany({
    where: { userId: session.user.id, status: "active" },
    select: {
      id: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          brandColor: true,
          logo: true,
        },
      },
    },
  });

  return NextResponse.json({
    activeTenantId: session.user.tenantId,
    tenants: clientProfiles.map((cp) => ({
      clientProfileId: cp.id,
      tenantId: cp.tenant.id,
      name: cp.tenant.name,
      slug: cp.tenant.slug,
      brandColor: cp.tenant.brandColor,
      logo: cp.tenant.logo,
    })),
  });
}
