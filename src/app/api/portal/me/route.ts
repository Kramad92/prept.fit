import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolvePhotoUrls } from "@/lib/s3";

// Get the logged-in client's full profile
export async function GET() {
  const session = await getSession();
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Push expiration filtering to Postgres for scalability.
  // Paused plans and subscription_tied require JS post-filtering (column comparison / client status).
  const planWhereFilter = {
    isActive: true,
    AND: [
      {
        OR: [
          { accessPolicy: "unlimited" },
          { accessPolicy: "subscription_tied" },
          { accessPolicy: "date_range", endDate: { gte: now } },
          { accessPolicy: "date_range", pausedAt: { not: null } },
          { accessPolicy: "date_range", endDate: null },
        ],
      },
      {
        OR: [
          { startDate: { lte: now } },
          { startDate: null },
        ],
      },
    ],
  };

  const programWhereFilter = {
    isActive: true,
    AND: [
      {
        OR: [
          { accessPolicy: "unlimited" },
          { accessPolicy: "subscription_tied" },
          { accessPolicy: "date_range", endDate: { gte: now } },
          { accessPolicy: "date_range", endDate: null },
        ],
      },
      {
        OR: [
          { startDate: { lte: now } },
        ],
      },
    ],
  };

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientProfileId },
    include: {
      tenant: { select: { name: true, brandColor: true, logo: true, coachPhoto: true } },
      progressPhotos: { orderBy: { takenAt: "desc" } },
      measurements: { orderBy: { date: "desc" }, take: 20 },
      assignedPlans: {
        where: planWhereFilter,
        include: {
          workoutPlan: {
            include: { exercises: { orderBy: { orderIndex: "asc" } } },
          },
          clientExercises: { orderBy: { orderIndex: "asc" } },
        },
      },
      schedules: {
        where: {
          date: { gte: now },
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
      assignedPrograms: {
        where: programWhereFilter,
        include: {
          program: {
            include: {
              days: {
                orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
                include: { workoutPlan: { select: { id: true, name: true, description: true } } },
              },
            },
          },
          clientWorkoutPlans: {
            include: {
              workoutPlan: {
                include: {
                  exercises: { orderBy: { orderIndex: "asc" } },
                  sourceTemplate: { select: { id: true, name: true } },
                },
              },
              clientExercises: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
      assignedNutritionPrograms: {
        where: programWhereFilter,
        include: {
          program: {
            include: {
              days: {
                orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
                include: { mealPlan: { select: { id: true, name: true, description: true } } },
              },
            },
          },
          clientMealPlans: {
            include: {
              mealPlan: {
                include: { meals: { orderBy: { orderIndex: "asc" } } },
              },
              clientMeals: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await resolvePhotoUrls(client.progressPhotos);

  // Post-filter paused plans: only keep if endDate hadn't passed when paused
  // (Prisma can't compare two columns, so this must be done in JS)
  const activePlans = (client.assignedPlans || []).filter((plan) => {
    if (plan.accessPolicy === "subscription_tied") {
      return client.status === "active";
    }
    // Paused date_range plans: only visible if they weren't already expired when paused
    if (plan.accessPolicy === "date_range" && plan.pausedAt && plan.endDate) {
      return new Date(plan.endDate) >= new Date(plan.pausedAt);
    }
    return true;
  });

  // Programs: subscription_tied post-filter
  const activePrograms = (client.assignedPrograms || []).filter((prog) => {
    if (prog.accessPolicy === "subscription_tied") {
      return client.status === "active";
    }
    return true;
  });

  // Nutrition programs: subscription_tied post-filter
  const activeNutritionPrograms = (client.assignedNutritionPrograms || []).filter((prog) => {
    if (prog.accessPolicy === "subscription_tied") {
      return client.status === "active";
    }
    return true;
  });

  return NextResponse.json({
    ...client,
    progressPhotos: photos,
    assignedPlans: activePlans,
    assignedPrograms: activePrograms,
    assignedNutritionPrograms: activeNutritionPrograms,
  });
}
