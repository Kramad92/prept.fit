import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, certificateSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const certificates = await prisma.certificate.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { orderIndex: "asc" },
  });

  return NextResponse.json(certificates);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, certificateSchema);
  if ("error" in parsed) return parsed.error;

  const certificate = await prisma.certificate.create({
    data: {
      ...parsed.data,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(certificate, { status: 201 });
}
