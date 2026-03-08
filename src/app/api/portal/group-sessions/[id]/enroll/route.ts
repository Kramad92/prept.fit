import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { enrollClientInSession } from "@/services/group-sessions";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify session is open
  const groupSession = await prisma.groupSession.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      isOpen: true,
      status: "scheduled",
    },
  });

  if (!groupSession) {
    return NextResponse.json({ error: "Session not available" }, { status: 404 });
  }

  const result = await prisma.$transaction(async (tx) => {
    return enrollClientInSession(tx, {
      sessionId: params.id,
      clientId: session.user.clientProfileId!,
      tenantId: session.user.tenantId,
    });
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.participant, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.groupSessionParticipant.deleteMany({
    where: {
      sessionId: params.id,
      clientId: session.user.clientProfileId,
    },
  });

  return new NextResponse(null, { status: 204 });
}
