import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupSessionEnrollSchema } from "@/lib/validations";
import { enrollClientInSession } from "@/services/group-sessions";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupSessionEnrollSchema);
  if ("error" in parsed) return parsed.error;

  // Verify client belongs to tenant
  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, tenantId: session.user.tenantId },
  });

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    return enrollClientInSession(tx, {
      sessionId: params.id,
      clientId: parsed.data.clientId,
      tenantId: session.user.tenantId,
    });
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.participant, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  // Verify session and client belong to tenant
  const [groupSession, client] = await Promise.all([
    prisma.groupSession.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } }),
    prisma.client.findFirst({ where: { id: clientId, tenantId: session.user.tenantId } }),
  ]);

  if (!groupSession) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await prisma.groupSessionParticipant.deleteMany({
    where: { sessionId: params.id, clientId },
  });

  return new NextResponse(null, { status: 204 });
}
