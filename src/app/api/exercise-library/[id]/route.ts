import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.exerciseLibrary.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const exercise = await prisma.exerciseLibrary.update({
    where: { id: params.id },
    data: {
      name: body.name,
      category: body.category,
      muscleGroup: body.muscleGroup,
      equipment: body.equipment,
      videoUrl: body.videoUrl,
      instructions: body.instructions,
    },
  });

  return NextResponse.json(exercise);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.exerciseLibrary.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
