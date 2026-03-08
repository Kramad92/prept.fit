import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, trainingGroupCreateSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.trainingGroup.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      _count: { select: { members: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, trainingGroupCreateSchema);
  if ("error" in parsed) return parsed.error;

  const group = await prisma.trainingGroup.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      maxParticipants: parsed.data.maxParticipants,
      tenantId: session.user.tenantId,
    },
    include: {
      _count: { select: { members: true, sessions: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
