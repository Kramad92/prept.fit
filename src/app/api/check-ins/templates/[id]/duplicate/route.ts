import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const original = await prisma.checkInTemplate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.checkInTemplate.create({
    data: {
      name: `${original.name} (Copy)`,
      questions: original.questions as any,
      frequency: original.frequency,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(copy, { status: 201 });
}
