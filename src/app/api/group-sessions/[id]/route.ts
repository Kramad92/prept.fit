import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupSessionUpdateSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groupSession = await prisma.groupSession.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      group: { select: { id: true, name: true } },
      workoutPlan: { select: { id: true, name: true } },
      participants: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { enrolledAt: "asc" },
      },
      _count: { select: { participants: true } },
    },
  });

  if (!groupSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(groupSession);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupSessionUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const data: any = { ...parsed.data };
  if (data.date) data.date = new Date(data.date);

  const result = await prisma.groupSession.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.groupSession.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      group: { select: { id: true, name: true } },
      workoutPlan: { select: { id: true, name: true } },
      _count: { select: { participants: true } },
    },
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

  const result = await prisma.groupSession.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
