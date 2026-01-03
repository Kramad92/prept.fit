import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await prisma.client.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
    },
    include: {
      progressPhotos: { orderBy: { takenAt: "desc" } },
      measurements: { orderBy: { date: "desc" }, take: 20 },
      assignedPlans: {
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
      },
      assignedMealPlans: {
        include: {
          mealPlan: {
            include: {
              meals: { orderBy: { orderIndex: "asc" } },
              sourceTemplate: { select: { id: true, name: true } },
            },
          },
          clientMeals: { orderBy: { orderIndex: "asc" } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const client = await prisma.client.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      gender: body.gender || null,
      goals: body.goals || null,
      notes: body.notes || null,
      status: body.status,
    },
  });

  if (client.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.client.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ success: true });
}
