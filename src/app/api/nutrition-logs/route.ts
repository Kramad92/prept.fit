import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, nutritionLogCreateSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const days = parseInt(searchParams.get("days") || "7");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // If client role, get their own logs
  if (session.user.role === "CLIENT" && session.user.clientProfileId) {
    const logs = await prisma.nutritionLog.findMany({
      where: { clientId: session.user.clientProfileId, date: { gte: since } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(logs);
  }

  // Coach viewing a specific client's logs
  if (clientId) {
    const logs = await prisma.nutritionLog.findMany({
      where: { clientId, date: { gte: since }, client: { tenantId: session.user.tenantId } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(logs);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, nutritionLogCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  // Determine clientId: client logs for themselves, coach logs for a client
  const clientId =
    session.user.role === "CLIENT" ? session.user.clientProfileId : body.clientId;

  if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  const log = await prisma.nutritionLog.create({
    data: {
      clientId,
      date: new Date(),
      mealName: body.mealName,
      foods: body.foods,
      calories: body.calories ?? null,
      protein: body.protein ?? null,
      carbs: body.carbs ?? null,
      fat: body.fat ?? null,
      notes: body.notes ?? null,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
