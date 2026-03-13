import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, foodLibrarySchema } from "@/lib/validations";

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

  const parsed = await validateBody(req, foodLibrarySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const updated = await prisma.foodLibrary.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      name: body.name,
      defaultPortion: body.portion || null,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      category: body.category,
    },
  });

  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const food = await prisma.foodLibrary.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
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
