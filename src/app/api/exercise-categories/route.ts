import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, exerciseCategorySchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.exerciseCategory.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, exerciseCategorySchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.exerciseCategory.findUnique({
    where: { tenantId_name: { tenantId: session.user.tenantId, name: parsed.data.name } },
  });
  if (existing) return NextResponse.json({ error: "Category already exists" }, { status: 409 });

  const category = await prisma.exerciseCategory.create({
    data: { name: parsed.data.name, tenantId: session.user.tenantId },
  });

  return NextResponse.json(category, { status: 201 });
}
