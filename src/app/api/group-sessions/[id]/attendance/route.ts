import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, groupAttendanceSchema } from "@/lib/validations";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, groupAttendanceSchema);
  if ("error" in parsed) return parsed.error;

  // Verify session belongs to tenant
  const groupSession = await prisma.groupSession.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  if (!groupSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Batch update attendance
  for (const p of parsed.data.participants) {
    await prisma.groupSessionParticipant.updateMany({
      where: {
        sessionId: params.id,
        clientId: p.clientId,
      },
      data: { status: p.status },
    });
  }

  const updated = await prisma.groupSession.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      participants: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json(updated);
}
