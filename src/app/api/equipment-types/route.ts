import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, equipmentTypeSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const types = await prisma.equipmentType.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(types);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, equipmentTypeSchema);
  if ("error" in parsed) return parsed.error;

  const existing = await prisma.equipmentType.findUnique({
    where: { tenantId_name: { tenantId: session.user.tenantId, name: parsed.data.name } },
  });
  if (existing) return NextResponse.json({ error: "Equipment type already exists" }, { status: 409 });

  const type = await prisma.equipmentType.create({
    data: { name: parsed.data.name, tenantId: session.user.tenantId },
  });

  return NextResponse.json(type, { status: 201 });
}
