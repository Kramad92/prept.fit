import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all"; // workout, meal, workout_program, nutrition_program, all
    const search = url.searchParams.get("search") || "";
    const tenantId = url.searchParams.get("tenantId") || "";

    const searchFilter = search
      ? { name: { contains: search, mode: "insensitive" as const } }
      : {};
    const tenantFilter = tenantId ? { tenantId } : {};

    const results: Record<string, unknown[]> = {};

    if (type === "all" || type === "workout") {
      results.workouts = await prisma.workoutPlan.findMany({
        where: { isTemplate: true, sourceTemplateId: null, ...searchFilter, ...tenantFilter },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
          _count: { select: { exercises: true, assignedTo: true, programDays: true } },
        },
      });
    }

    if (type === "all" || type === "meal") {
      results.mealPlans = await prisma.mealPlan.findMany({
        where: { isTemplate: true, sourceTemplateId: null, ...searchFilter, ...tenantFilter },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          description: true,
          targetCalories: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
          _count: { select: { meals: true, assignedTo: true, programDays: true } },
        },
      });
    }

    if (type === "all" || type === "workout_program") {
      results.workoutPrograms = await prisma.workoutProgram.findMany({
        where: { isTemplate: true, sourceTemplateId: null, ...searchFilter, ...tenantFilter },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          description: true,
          durationWeeks: true,
          daysPerWeek: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
          _count: { select: { days: true, assignments: true } },
          days: {
            select: {
              id: true,
              weekNumber: true,
              dayNumber: true,
              label: true,
              workoutPlan: { select: { id: true, name: true } },
            },
            orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
          },
        },
      });
    }

    if (type === "all" || type === "nutrition_program") {
      results.nutritionPrograms = await prisma.nutritionProgram.findMany({
        where: { isTemplate: true, sourceTemplateId: null, ...searchFilter, ...tenantFilter },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          name: true,
          description: true,
          durationWeeks: true,
          mealsPerDay: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
          _count: { select: { days: true, assignments: true } },
          days: {
            select: {
              id: true,
              weekNumber: true,
              dayNumber: true,
              label: true,
              mealPlan: { select: { id: true, name: true } },
            },
            orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
          },
        },
      });
    }

    // Also return tenant list for the copy dropdown
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ ...results, tenants });
  } catch (err: unknown) {
    console.error("[admin/templates] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
