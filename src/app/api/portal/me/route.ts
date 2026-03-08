import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Get the logged-in client's full profile
export async function GET() {
  const session = await getSession();
  console.log("[portal/me] session:", JSON.stringify(session?.user, null, 2));
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientProfileId },
    include: {
      tenant: { select: { name: true, brandColor: true, logo: true } },
      progressPhotos: { orderBy: { takenAt: "desc" } },
      measurements: { orderBy: { date: "desc" }, take: 20 },
      assignedPlans: {
        where: { isActive: true },
        include: {
          workoutPlan: {
            include: { exercises: { orderBy: { orderIndex: "asc" } } },
          },
          clientExercises: { orderBy: { orderIndex: "asc" } },
        },
      },
      schedules: {
        where: {
          date: { gte: new Date() },
          status: { not: "cancelled" },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 10,
      },
      assignedMealPlans: {
        where: { isActive: true },
        include: {
          mealPlan: {
            include: { meals: { orderBy: { orderIndex: "asc" } } },
          },
          clientMeals: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  return NextResponse.json(client);
}
