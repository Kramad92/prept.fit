import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyWorkoutPlan, createCustomWorkoutPlan } from "@/services/workout-plans";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignments = await prisma.clientWorkoutPlan.findMany({
    where: { clientId: params.id, client: { tenantId: session.user.tenantId } },
    include: {
      workoutPlan: {
        include: {
          exercises: { orderBy: { orderIndex: "asc" } },
          sourceTemplate: { select: { id: true, name: true } },
        },
      },
      clientExercises: { orderBy: { orderIndex: "asc" } },
    },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clientId = params.id;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: session.user.tenantId },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = await req.json();

  if (body.workoutPlanId) {
    const result = await prisma.$transaction(async (tx) => {
      return deepCopyWorkoutPlan(tx, {
        originalPlanId: body.workoutPlanId,
        clientId,
        tenantId: session.user.tenantId,
        mode: body.mode,
      });
    });

    if (!result) return NextResponse.json({ error: "Workout plan not found" }, { status: 404 });
    return NextResponse.json(result, { status: 201 });
  }

  if (body.name) {
    const result = await prisma.$transaction(async (tx) => {
      return createCustomWorkoutPlan(tx, {
        name: body.name,
        description: body.description,
        clientId,
        tenantId: session.user.tenantId,
        mode: body.mode,
        exercises: (body.exercises || []).map((ex: any, i: number) => ({
          name: ex.name,
          sets: ex.sets ? parseInt(ex.sets) : null,
          reps: ex.reps || null,
          weight: ex.weight || null,
          restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
          notes: ex.notes || null,
          videoUrl: ex.videoUrl || null,
          orderIndex: i,
          superset: ex.superset || null,
        })),
      });
    });

    return NextResponse.json(result, { status: 201 });
  }

  return NextResponse.json(
    { error: "Provide either workoutPlanId or name with exercises" },
    { status: 400 }
  );
}
