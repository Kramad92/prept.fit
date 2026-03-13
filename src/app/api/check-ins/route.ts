import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, checkInSubmitSchema } from "@/lib/validations";
import { sendPushToUser } from "@/services/push-notifications";

// Get check-ins (coach sees all, client sees own)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  const where: any = {};

  if (session.user.role === "CLIENT" && session.user.clientProfileId) {
    where.clientId = session.user.clientProfileId;
  } else if (clientId) {
    // Verify the client belongs to this coach's tenant
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId: session.user.tenantId },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
    where.clientId = clientId;
  } else {
    // Coach with no clientId filter — scope to tenant's clients
    where.client = { tenantId: session.user.tenantId };
  }

  const checkIns = await prisma.checkIn.findMany({
    where,
    include: {
      template: { select: { name: true, questions: true } },
      client: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 50,
  });

  return NextResponse.json(checkIns);
}

// Client submits a check-in
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await validateBody(req, checkInSubmitSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const checkIn = await prisma.checkIn.create({
    data: {
      answers: body.answers,
      templateId: body.templateId,
      clientId: session.user.clientProfileId,
    },
  });

  // Notify coach
  const coachUser = await prisma.user.findFirst({
    where: { tenantId: session.user.tenantId, role: "COACH" },
  });

  if (coachUser) {
    const notifBody = `${session.user.name} submitted a check-in`;
    await prisma.notification.create({
      data: {
        type: "check_in_submitted",
        title: "Check-in submitted",
        body: notifBody,
        userId: coachUser.id,
        tenantId: session.user.tenantId,
        data: { checkInId: checkIn.id, clientId: session.user.clientProfileId },
      },
    });

    // Send push notification
    sendPushToUser(coachUser.id, {
      title: "Check-in submitted",
      body: notifBody,
      data: { type: "check_in_submitted", clientId: session.user.clientProfileId || "" },
    }).catch(() => {});
  }

  return NextResponse.json(checkIn, { status: 201 });
}
