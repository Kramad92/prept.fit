import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupMembersAddSchema } from "@/lib/validations";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupMembersAddSchema);
  if ("error" in parsed) return parsed.error;

  // Verify group belongs to tenant
  const group = await prisma.trainingGroup.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { members: true } } },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check capacity
  if (group._count.members + parsed.data.clientIds.length > group.maxParticipants) {
    return NextResponse.json({ error: "Would exceed max participants" }, { status: 400 });
  }

  // Verify all clients belong to tenant
  const clients = await prisma.client.findMany({
    where: {
      id: { in: parsed.data.clientIds },
      tenantId: session.user.tenantId,
    },
    select: { id: true },
  });

  const validClientIds = clients.map((c) => c.id);

  // Upsert members (skip duplicates)
  for (const clientId of validClientIds) {
    await prisma.trainingGroupMember.upsert({
      where: {
        groupId_clientId: { groupId: params.id, clientId },
      },
      create: { groupId: params.id, clientId },
      update: {},
    });
  }

  const updated = await prisma.trainingGroup.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "desc" },
      },
      _count: { select: { members: true, sessions: true } },
    },
  });

  return NextResponse.json(updated);
}
