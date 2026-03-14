import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, workoutPlanSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.workoutPlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      exercises: { orderBy: { orderIndex: "asc" } },
      assignedTo: {
        include: { client: { select: { id: true, name: true, status: true } } },
      },
      // For templates: also include assignments from cloned copies
      clones: {
        select: {
          assignedTo: {
            include: { client: { select: { id: true, name: true, status: true } } },
          },
        },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Merge direct assignments with assignments from clones (deep-copied plans)
  const cloneAssignments = plan.clones.flatMap((c) => c.assignedTo);
  const merged = {
    ...plan,
    assignedTo: [...plan.assignedTo, ...cloneAssignments],
    clones: undefined,
  };

  return NextResponse.json(merged);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.workoutPlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = await validateBody(req, workoutPlanSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // Delete old exercises and create new ones in a transaction
  const plan = await prisma.$transaction(async (tx) => {
    await tx.exercise.deleteMany({ where: { workoutPlanId: params.id } });

    return tx.workoutPlan.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        isTemplate: body.isTemplate,
        exercises: {
          create: (body.exercises || []).map(
            (ex: any, i: number) => ({
              name: ex.name,
              sets: ex.sets ? parseInt(ex.sets) : null,
              reps: ex.reps || null,
              weight: ex.weight || null,
              restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
              notes: ex.notes || null,
              videoUrl: ex.videoUrl || null,
              orderIndex: i,
            })
          ),
        },
      },
      include: { exercises: { orderBy: { orderIndex: "asc" } } },
    });
  });

  return NextResponse.json(plan);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  const toDelete = await prisma.workoutPlan.findFirst({
    where: { id, tenantId: session.user.tenantId },
    select: { id: true },
  });

  if (!toDelete) {
    // Check if plan exists at all (wrong tenant?) for debugging
    const exists = await prisma.workoutPlan.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
    console.error(`[DELETE /api/workouts/${id}] Not found for tenant ${session.user.tenantId}. Exists: ${!!exists}, plan tenant: ${exists?.tenantId}`);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.workoutPlan.delete({ where: { id } });
  } catch (err: any) {
    console.error(`[DELETE /api/workouts/${id}] Delete failed:`, err.message);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
