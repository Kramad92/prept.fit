import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.foodLibrary.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const food = await prisma.foodLibrary.update({
    where: { id: params.id },
    data: {
      name: body.name,
      defaultPortion: body.defaultPortion,
      calories: body.calories ? parseInt(body.calories) : null,
      protein: body.protein ? parseInt(body.protein) : null,
      carbs: body.carbs ? parseInt(body.carbs) : null,
      fat: body.fat ? parseInt(body.fat) : null,
      category: body.category,
    },
  });

  return NextResponse.json(food);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.foodLibrary.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
