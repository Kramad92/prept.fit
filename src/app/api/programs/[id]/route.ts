import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, workoutProgramSchema } from "@/lib/validations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const program = await prisma.workoutProgram.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      days: {
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
        include: { workoutPlan: { select: { id: true, name: true, description: true } } },
      },
      assignments: {
        include: {
          client: { select: { id: true, name: true, status: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(program);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const parsed = await validateBody(req, workoutProgramSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const existing = await prisma.workoutProgram.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const program = await prisma.$transaction(async (tx) => {
    // Delete existing days and recreate
    await tx.workoutProgramDay.deleteMany({ where: { programId: id } });

    return tx.workoutProgram.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description || null,
        durationWeeks: body.durationWeeks,
        daysPerWeek: body.daysPerWeek,
        days: {
          create: (body.days || []).map((d) => ({
            weekNumber: d.weekNumber,
            dayNumber: d.dayNumber,
            label: d.label || null,
            workoutPlanId: d.workoutPlanId || null,
          })),
        },
      },
      include: {
        days: {
          orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
          include: { workoutPlan: { select: { id: true, name: true, description: true } } },
        },
      },
    });
  });

  return NextResponse.json(program);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.workoutProgram.findFirst({
    where: { id, tenantId: session.user.tenantId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutProgram.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
