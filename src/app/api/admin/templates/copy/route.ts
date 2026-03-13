import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { Prisma } from "@prisma/client";

const schema = z.object({
  type: z.enum(["workout", "meal", "workout_program", "nutrition_program"]),
  sourceId: z.string().min(1),
  targetTenantId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const parsed = await validateBody(req, schema);
    if ("error" in parsed) return parsed.error;

    const { type, sourceId, targetTenantId } = parsed.data;

    // Verify target tenant exists
    const targetTenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
    if (!targetTenant) {
      return NextResponse.json({ error: "Target tenant not found" }, { status: 404 });
    }

    let result: { id: string; name: string; type: string };

    if (type === "workout") {
      result = await copyWorkoutPlan(sourceId, targetTenantId);
    } else if (type === "meal") {
      result = await copyMealPlan(sourceId, targetTenantId);
    } else if (type === "workout_program") {
      result = await copyWorkoutProgram(sourceId, targetTenantId);
    } else {
      result = await copyNutritionProgram(sourceId, targetTenantId);
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("Admin template copy error:", e);
    const msg = e instanceof Error ? e.message : "Copy failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function copyWorkoutPlan(sourceId: string, targetTenantId: string) {
  const original = await prisma.workoutPlan.findUnique({
    where: { id: sourceId },
    include: { exercises: { orderBy: { orderIndex: "asc" } } },
  });
  if (!original) throw new Error("Workout plan not found");

  const clone = await prisma.workoutPlan.create({
    data: {
      name: original.name,
      description: original.description,
      isTemplate: true,
      tenantId: targetTenantId,
      exercises: {
        create: original.exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          videoUrl: ex.videoUrl,
          orderIndex: ex.orderIndex,
          superset: ex.superset,
        })),
      },
    },
  });

  return { id: clone.id, name: clone.name, type: "workout" };
}

async function copyMealPlan(sourceId: string, targetTenantId: string) {
  const original = await prisma.mealPlan.findUnique({
    where: { id: sourceId },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });
  if (!original) throw new Error("Meal plan not found");

  const clone = await prisma.mealPlan.create({
    data: {
      name: original.name,
      description: original.description,
      isTemplate: true,
      targetCalories: original.targetCalories,
      targetProtein: original.targetProtein,
      targetCarbs: original.targetCarbs,
      targetFat: original.targetFat,
      tenantId: targetTenantId,
      meals: {
        create: original.meals.map((meal) => ({
          name: meal.name,
          description: meal.description,
          time: meal.time,
          foods: meal.foods as Prisma.InputJsonValue,
          orderIndex: meal.orderIndex,
        })),
      },
    },
  });

  return { id: clone.id, name: clone.name, type: "meal" };
}

async function copyWorkoutProgram(sourceId: string, targetTenantId: string) {
  const original = await prisma.workoutProgram.findUnique({
    where: { id: sourceId },
    include: {
      days: {
        include: {
          workoutPlan: { include: { exercises: { orderBy: { orderIndex: "asc" } } } },
        },
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
      },
    },
  });
  if (!original) throw new Error("Workout program not found");

  // Copy all referenced workout plans first, build a mapping old -> new
  const planIdMap = new Map<string, string>();

  for (const day of original.days) {
    if (day.workoutPlanId && day.workoutPlan && !planIdMap.has(day.workoutPlanId)) {
      const wp = day.workoutPlan;
      const clonedPlan = await prisma.workoutPlan.create({
        data: {
          name: wp.name,
          description: wp.description,
          isTemplate: true,
          tenantId: targetTenantId,
          exercises: {
            create: wp.exercises.map((ex) => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              weight: ex.weight,
              restSeconds: ex.restSeconds,
              notes: ex.notes,
              videoUrl: ex.videoUrl,
              orderIndex: ex.orderIndex,
              superset: ex.superset,
            })),
          },
        },
      });
      planIdMap.set(day.workoutPlanId, clonedPlan.id);
    }
  }

  // Now create the program with remapped day references
  const clone = await prisma.workoutProgram.create({
    data: {
      name: original.name,
      description: original.description,
      durationWeeks: original.durationWeeks,
      daysPerWeek: original.daysPerWeek,
      isTemplate: true,
      tenantId: targetTenantId,
      days: {
        create: original.days.map((day) => ({
          weekNumber: day.weekNumber,
          dayNumber: day.dayNumber,
          label: day.label,
          workoutPlanId: day.workoutPlanId ? planIdMap.get(day.workoutPlanId) || null : null,
        })),
      },
    },
  });

  return { id: clone.id, name: clone.name, type: "workout_program" };
}

async function copyNutritionProgram(sourceId: string, targetTenantId: string) {
  const original = await prisma.nutritionProgram.findUnique({
    where: { id: sourceId },
    include: {
      days: {
        include: {
          mealPlan: { include: { meals: { orderBy: { orderIndex: "asc" } } } },
        },
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
      },
    },
  });
  if (!original) throw new Error("Nutrition program not found");

  // Copy all referenced meal plans first
  const planIdMap = new Map<string, string>();

  for (const day of original.days) {
    if (day.mealPlanId && day.mealPlan && !planIdMap.has(day.mealPlanId)) {
      const mp = day.mealPlan;
      const clonedPlan = await prisma.mealPlan.create({
        data: {
          name: mp.name,
          description: mp.description,
          isTemplate: true,
          targetCalories: mp.targetCalories,
          targetProtein: mp.targetProtein,
          targetCarbs: mp.targetCarbs,
          targetFat: mp.targetFat,
          tenantId: targetTenantId,
          meals: {
            create: mp.meals.map((meal) => ({
              name: meal.name,
              description: meal.description,
              time: meal.time,
              foods: meal.foods as Prisma.InputJsonValue,
              orderIndex: meal.orderIndex,
            })),
          },
        },
      });
      planIdMap.set(day.mealPlanId, clonedPlan.id);
    }
  }

  const clone = await prisma.nutritionProgram.create({
    data: {
      name: original.name,
      description: original.description,
      durationWeeks: original.durationWeeks,
      mealsPerDay: original.mealsPerDay,
      isTemplate: true,
      tenantId: targetTenantId,
      days: {
        create: original.days.map((day) => ({
          weekNumber: day.weekNumber,
          dayNumber: day.dayNumber,
          label: day.label,
          mealPlanId: day.mealPlanId ? planIdMap.get(day.mealPlanId) || null : null,
        })),
      },
    },
  });

  return { id: clone.id, name: clone.name, type: "nutrition_program" };
}
