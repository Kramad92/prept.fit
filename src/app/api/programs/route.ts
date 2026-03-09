import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, workoutProgramSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const programs = await prisma.workoutProgram.findMany({
    where: { tenantId: session.user.tenantId, sourceTemplateId: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationWeeks: true,
      daysPerWeek: true,
      isTemplate: true,
      _count: { select: { days: true, assignments: true } },
    },
  });

  const result = programs.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    durationWeeks: p.durationWeeks,
    daysPerWeek: p.daysPerWeek,
    isTemplate: p.isTemplate,
    dayCount: p._count.days,
    assignedCount: p._count.assignments,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, workoutProgramSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const program = await prisma.workoutProgram.create({
    data: {
      name: body.name,
      description: body.description || null,
      durationWeeks: body.durationWeeks,
      daysPerWeek: body.daysPerWeek,
      isTemplate: true,
      tenantId: session.user.tenantId,
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

  return NextResponse.json(program, { status: 201 });
}
