import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, checkInTemplateSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, checkInTemplateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const template = await prisma.checkInTemplate.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: {
      name: body.name,
      questions: body.questions,
      frequency: body.frequency,
    },
  });

  if (template.count === 0) {
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

  await prisma.checkInTemplate.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ ok: true });
}
