import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, checkInTemplateSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.checkInTemplate.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, checkInTemplateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const template = await prisma.checkInTemplate.create({
    data: {
      name: body.name,
      questions: body.questions,
      frequency: body.frequency,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(template, { status: 201 });
}
