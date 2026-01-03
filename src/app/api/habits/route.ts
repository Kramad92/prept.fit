import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  const body = await req.json();

  const habit = await prisma.habitTemplate.create({
    data: {
      name: body.name,
      icon: body.icon || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(habit, { status: 201 });
}
