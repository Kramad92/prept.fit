import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { adjustProgramForClient } from "@/lib/ai-adjust";

const schema = z.object({
  programId: z.string().min(1),
  clientId: z.string().min(1),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("bs"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { programId, clientId, locale } = parsed.data;
  const tenantId = session.user.tenantId;

  // Fetch the program with all days and their workouts + exercises
  const program = await prisma.workoutProgram.findFirst({
    where: { id: programId, tenantId },
    select: {
      id: true,
      name: true,
      durationWeeks: true,
      daysPerWeek: true,
      days: {
        select: {
          weekNumber: true,
          dayNumber: true,
          label: true,
          exerciseSwaps: true,
          workoutPlan: {
            select: {
              name: true,
              exercises: {
                select: { name: true, sets: true, reps: true, weight: true, restSeconds: true },
                orderBy: { orderIndex: "asc" },
              },
            },
          },
        },
        orderBy: [{ weekNumber: "asc" }, { dayNumber: "asc" }],
      },
    },
  });

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  // Verify client belongs to tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    select: { id: true },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Build the workout data structure with exercise swaps applied
  const workoutsPerWeek = program.days
    .filter((d) => d.workoutPlan)
    .map((day) => {
      let exercises = day.workoutPlan!.exercises.map((ex) => ({
        name: ex.name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        restSeconds: ex.restSeconds,
      }));

      // Apply exercise swaps for this day (if any)
      const swaps = day.exerciseSwaps as Array<{
        originalExerciseName: string;
        swapExerciseName: string;
      }> | null;

      if (swaps?.length) {
        const swapMap = new Map(
          swaps.map((s) => [s.originalExerciseName.toLowerCase(), s.swapExerciseName])
        );
        exercises = exercises.map((ex) => {
          const swapName = swapMap.get(ex.name.toLowerCase());
          return swapName ? { ...ex, name: swapName } : ex;
        });
      }

      return {
        weekNumber: day.weekNumber,
        dayNumber: day.dayNumber,
        workoutName: day.workoutPlan!.name,
        exercises,
      };
    });

  try {
    const adjusted = await adjustProgramForClient(
      clientId,
      {
        name: program.name,
        durationWeeks: program.durationWeeks,
        workoutsPerWeek,
      },
      locale
    );

    return NextResponse.json({
      programId: program.id,
      programName: program.name,
      clientId,
      ...adjusted,
    });
  } catch (e) {
    console.error("AI adjust-program error:", e);
    return NextResponse.json({ error: "Failed to adjust program" }, { status: 502 });
  }
}
