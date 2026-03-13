import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { resolvePhotoUrls } from "@/lib/s3";

// Get the logged-in client's full profile
export async function GET() {
  const session = await getSession();
  console.log("[portal/me] session:", JSON.stringify(session?.user, null, 2));
  if (!session || !session.user.clientProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

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
        where: { isActive: true },
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
                include: { exercises: { orderBy: { orderIndex: "asc" } } },
              },
              clientExercises: { orderBy: { orderIndex: "asc" } },
            },
          },
        },
      },
      assignedNutritionPrograms: {
        where: { isActive: true },
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

  // Filter out expired plans based on access policy
  const activePlans = (client.assignedPlans || []).filter((plan) => {
    if (plan.accessPolicy === "unlimited") return true;
    if (plan.accessPolicy === "date_range" && plan.endDate) {
      // Paused plans don't expire (time is frozen)
      if (plan.pausedAt) return true;
      return new Date(plan.endDate) >= now;
    }
    if (plan.accessPolicy === "subscription_tied") {
      return client.status === "active";
    }
    return true;
  });

  // Filter expired programs
  const activePrograms = (client.assignedPrograms || []).filter((prog) => {
    if (prog.accessPolicy === "unlimited") return true;
    if (prog.accessPolicy === "date_range" && prog.endDate) {
      return new Date(prog.endDate) >= now;
    }
    if (prog.accessPolicy === "subscription_tied") {
      return client.status === "active";
    }
    return true;
  });

  // Filter expired nutrition programs
  const activeNutritionPrograms = (client.assignedNutritionPrograms || []).filter((prog) => {
    if (prog.accessPolicy === "unlimited") return true;
    if (prog.accessPolicy === "date_range" && prog.endDate) {
      return new Date(prog.endDate) >= now;
    }
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
