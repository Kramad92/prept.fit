import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; clientId: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify group belongs to tenant
  const group = await prisma.trainingGroup.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.trainingGroupMember.deleteMany({
    where: { groupId: params.id, clientId: params.clientId },
  });

  return new NextResponse(null, { status: 204 });
}
