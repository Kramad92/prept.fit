import { NextRequest, NextResponse } from "next/server";
import { requireClient } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// POST: Switch active tenant for multi-coach clients
export async function POST(req: NextRequest) {
  const session = await requireClient();

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { tenantId } = body;
  if (!tenantId || typeof tenantId !== "string") {
    return NextResponse.json({ error: "tenantId required" }, { status: 400 });
  }

  // Verify this client actually belongs to the requested tenant
  const clientProfile = await prisma.client.findFirst({
    where: { userId: session.user.id, tenantId, status: "active" },
    include: { tenant: { select: { slug: true } } },
  });

  if (!clientProfile) {
    return NextResponse.json({ error: "Not a member of this tenant" }, { status: 403 });
  }

  // Update user's active tenant
  await prisma.user.update({
    where: { id: session.user.id },
    data: { tenantId },
  });

  return NextResponse.json({
    tenantId,
    tenantSlug: clientProfile.tenant.slug,
    clientProfileId: clientProfile.id,
  });
}
