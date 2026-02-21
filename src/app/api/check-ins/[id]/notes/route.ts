import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Coach adds notes to a check-in
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkIn = await prisma.checkIn.findFirst({
    where: { id: params.id },
    include: { template: { select: { tenantId: true } } },
  });
  if (!checkIn || checkIn.template.tenantId !== session.user.tenantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { coachNotes } = await req.json();

  await prisma.checkIn.update({
    where: { id: params.id },
    data: { coachNotes },
  });

  return NextResponse.json({ success: true });
}
