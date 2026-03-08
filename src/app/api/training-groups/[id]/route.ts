import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, trainingGroupUpdateSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const group = await prisma.trainingGroup.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      members: {
        include: { client: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "desc" },
      },
      sessions: {
        include: {
          _count: { select: { participants: true } },
        },
        orderBy: { date: "desc" },
        take: 20,
      },
      _count: { select: { members: true, sessions: true } },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(group);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, trainingGroupUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const group = await prisma.trainingGroup.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: parsed.data,
  });

  if (group.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.trainingGroup.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { _count: { select: { members: true, sessions: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.trainingGroup.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
