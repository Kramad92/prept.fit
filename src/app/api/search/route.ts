import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireCoach();
    const tenantId = session.user.tenantId;
    const q = req.nextUrl.searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ clients: [], exercises: [], workoutPlans: [], mealPlans: [] });
    }

    const [clients, exercises, workoutPlans, mealPlans] = await Promise.all([
      prisma.client.findMany({
        where: {
          tenantId,
          status: { not: "archived" },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true, status: true },
        take: 5,
        orderBy: { name: "asc" },
      }),
      prisma.exerciseLibrary.findMany({
        where: {
          tenantId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { nameBs: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
            { muscleGroup: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, nameBs: true, category: true, muscleGroup: true },
        take: 5,
        orderBy: { name: "asc" },
      }),
      prisma.workoutPlan.findMany({
        where: {
          tenantId,
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, description: true },
        take: 5,
        orderBy: { name: "asc" },
      }),
      prisma.mealPlan.findMany({
        where: {
          tenantId,
          name: { contains: q, mode: "insensitive" },
        },
        select: { id: true, name: true, description: true },
        take: 5,
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ clients, exercises, workoutPlans, mealPlans });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
