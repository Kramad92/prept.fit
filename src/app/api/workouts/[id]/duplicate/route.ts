import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.workoutPlan.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.workoutPlan.create({
    data: {
      name: `${original.name} (Copy)`,
      description: original.description,
      isTemplate: original.isTemplate,
      tenantId: session.user.tenantId,
      exercises: {
        create: original.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          videoUrl: ex.videoUrl,
          orderIndex: ex.orderIndex,
          superset: ex.superset,
        })),
      },
    },
    include: { exercises: true },
  });

  return NextResponse.json(copy, { status: 201 });
}
