import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { deepCopyMealPlan } from "@/services/meal-plans";
import { validateBody, nutritionProgramAssignSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, nutritionProgramAssignSchema);
  if ("error" in parsed) return parsed.error;
  const { clientId, programId, startDate, accessPolicy, notes } = parsed.data;

  // Verify program belongs to tenant
  const program = await prisma.nutritionProgram.findFirst({
    where: { id: programId, tenantId: session.user.tenantId },
    include: {
      days: {
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
        where: { mealPlanId: { not: null } },
      },
    },
  });

  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const programStartDate = new Date(startDate);
  const endDate = new Date(programStartDate);
  endDate.setDate(endDate.getDate() + program.durationWeeks * 7);

  const result = await prisma.$transaction(async (tx) => {
    const assignment = await tx.clientNutritionProgram.create({
      data: {
        clientId,
        programId,
        startDate: programStartDate,
        endDate: accessPolicy === "unlimited" ? null : endDate,
        accessPolicy,
        notes: notes || null,
        isActive: true,
      },
    });

    // Deep-copy each meal plan for each program day
    for (const day of program.days) {
      if (!day.mealPlanId) continue;

      await deepCopyMealPlan(tx, {
        originalPlanId: day.mealPlanId,
        clientId,
        tenantId: session.user.tenantId,
        clientNutritionProgramId: assignment.id,
      });
    }

    return tx.clientNutritionProgram.findUnique({
      where: { id: assignment.id },
      include: {
        program: {
          include: {
            days: {
              orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
              include: { mealPlan: { select: { id: true, name: true } } },
            },
          },
        },
        client: { select: { id: true, name: true } },
        clientMealPlans: {
          include: {
            mealPlan: { select: { id: true, name: true } },
          },
        },
      },
    });
  });

  return NextResponse.json(result, { status: 201 });
}
