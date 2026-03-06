import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, clientCreateSchema } from "@/lib/validations";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clients = await prisma.client.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      gender: true,
      status: true,
      goals: true,
      createdAt: true,
      _count: { select: { progressPhotos: true, assignedPlans: true } },
    },
  });

  return NextResponse.json(clients, {
    headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, clientCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const client = await prisma.client.create({
    data: {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      gender: body.gender || null,
      goals: body.goals || null,
      notes: body.notes || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
