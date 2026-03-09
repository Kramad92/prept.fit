import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, habitCreateSchema, habitUpdateSchema } from "@/lib/validations";

// Get habit templates for the tenant
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const habits = await prisma.habitTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(habits);
}

// Coach creates a habit template
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, habitCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const habit = await prisma.habitTemplate.create({
    data: {
      name: body.name,
      icon: body.icon ?? null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(habit, { status: 201 });
}

// Coach updates a habit template
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, habitUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name, icon } = parsed.data;

  const habit = await prisma.habitTemplate.updateMany({
    where: { id, tenantId: session.user.tenantId },
    data: { name, icon: icon ?? null },
  });

  if (habit.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.habitTemplate.findUnique({ where: { id } });
  return NextResponse.json(updated);
}

// Coach deletes a habit template
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Delete all related client habits and logs first
  await prisma.$transaction([
    prisma.habitLog.deleteMany({
      where: { clientHabit: { habit: { id, tenantId: session.user.tenantId } } },
    }),
    prisma.clientHabit.deleteMany({
      where: { habit: { id, tenantId: session.user.tenantId } },
    }),
    prisma.habitTemplate.deleteMany({
      where: { id, tenantId: session.user.tenantId },
    }),
  ]);

  return NextResponse.json({ success: true });
}
