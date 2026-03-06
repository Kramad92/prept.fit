import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, workoutPlanSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.workoutPlan.findMany({
    where: { tenantId: session.user.tenantId, sourceTemplateId: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { exercises: true, assignedTo: true } },
    },
  });

  const result = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    isTemplate: p.isTemplate,
    exerciseCount: p._count.exercises,
    assignedCount: p._count.assignedTo,
  }));

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, workoutPlanSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const plan = await prisma.workoutPlan.create({
    data: {
      name: body.name,
      description: body.description || null,
      isTemplate: body.isTemplate || false,
      tenantId: session.user.tenantId,
      exercises: {
        create: (body.exercises || []).map(
          (ex: any, i: number) => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restSeconds: ex.restSeconds,
            notes: ex.notes,
            videoUrl: ex.videoUrl,
            orderIndex: ex.orderIndex ?? i,
          })
        ),
      },
    },
    include: { exercises: true },
  });

  return NextResponse.json(plan, { status: 201 });
}
