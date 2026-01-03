import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
    },
  });

  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(plan);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

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

  await prisma.workoutPlan.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ ok: true });
}
