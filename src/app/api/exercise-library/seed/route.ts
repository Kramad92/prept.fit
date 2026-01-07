import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const DEFAULT_EXERCISES = [
  // Chest
  { name: "Barbell Bench Press", category: "Chest", muscleGroup: "Pectorals", equipment: "Barbell" },
  { name: "Incline Barbell Bench Press", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Barbell" },
  { name: "Decline Barbell Bench Press", category: "Chest", muscleGroup: "Lower Pectorals", equipment: "Barbell" },
  { name: "Dumbbell Bench Press", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell" },
  { name: "Incline Dumbbell Press", category: "Chest", muscleGroup: "Upper Pectorals", equipment: "Dumbbell" },
  { name: "Dumbbell Flyes", category: "Chest", muscleGroup: "Pectorals", equipment: "Dumbbell" },
  { name: "Cable Flyes", category: "Chest", muscleGroup: "Pectorals", equipment: "Cable" },
  { name: "Push-Ups", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight" },
  { name: "Chest Dips", category: "Chest", muscleGroup: "Pectorals", equipment: "Bodyweight" },
  { name: "Machine Chest Press", category: "Chest", muscleGroup: "Pectorals", equipment: "Machine" },

  // Back
  { name: "Deadlift", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell" },
  { name: "Barbell Row", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Barbell" },
  { name: "Pull-Ups", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight" },
  { name: "Chin-Ups", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Bodyweight" },
  { name: "Lat Pulldown", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Cable" },
  { name: "Seated Cable Row", category: "Back", muscleGroup: "Rhomboids", equipment: "Cable" },
  { name: "Dumbbell Row", category: "Back", muscleGroup: "Latissimus Dorsi", equipment: "Dumbbell" },
  { name: "T-Bar Row", category: "Back", muscleGroup: "Middle Back", equipment: "Barbell" },
  { name: "Face Pulls", category: "Back", muscleGroup: "Rear Deltoids", equipment: "Cable" },
  { name: "Rack Pulls", category: "Back", muscleGroup: "Erector Spinae", equipment: "Barbell" },

  // Legs
  { name: "Barbell Squat", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell" },
  { name: "Front Squat", category: "Legs", muscleGroup: "Quadriceps", equipment: "Barbell" },
  { name: "Goblet Squat", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell" },
  { name: "Leg Press", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine" },
  { name: "Romanian Deadlift", category: "Legs", muscleGroup: "Hamstrings", equipment: "Barbell" },
  { name: "Bulgarian Split Squat", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell" },
  { name: "Lunges", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell" },
  { name: "Walking Lunges", category: "Legs", muscleGroup: "Quadriceps", equipment: "Dumbbell" },
  { name: "Leg Extension", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine" },
  { name: "Leg Curl", category: "Legs", muscleGroup: "Hamstrings", equipment: "Machine" },
  { name: "Hip Thrust", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell" },
  { name: "Calf Raises", category: "Legs", muscleGroup: "Calves", equipment: "Machine" },
  { name: "Sumo Deadlift", category: "Legs", muscleGroup: "Glutes", equipment: "Barbell" },
  { name: "Hack Squat", category: "Legs", muscleGroup: "Quadriceps", equipment: "Machine" },
  { name: "Glute Bridge", category: "Legs", muscleGroup: "Glutes", equipment: "Bodyweight" },

  // Shoulders
  { name: "Overhead Press", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell" },
  { name: "Dumbbell Shoulder Press", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell" },
  { name: "Arnold Press", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Dumbbell" },
  { name: "Lateral Raises", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Dumbbell" },
  { name: "Front Raises", category: "Shoulders", muscleGroup: "Anterior Deltoid", equipment: "Dumbbell" },
  { name: "Reverse Flyes", category: "Shoulders", muscleGroup: "Rear Deltoid", equipment: "Dumbbell" },
  { name: "Upright Row", category: "Shoulders", muscleGroup: "Deltoids", equipment: "Barbell" },
  { name: "Cable Lateral Raises", category: "Shoulders", muscleGroup: "Lateral Deltoid", equipment: "Cable" },
  { name: "Shrugs", category: "Shoulders", muscleGroup: "Trapezius", equipment: "Dumbbell" },

  // Arms
  { name: "Barbell Curl", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell" },
  { name: "Dumbbell Curl", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell" },
  { name: "Hammer Curls", category: "Arms", muscleGroup: "Brachialis", equipment: "Dumbbell" },
  { name: "Preacher Curl", category: "Arms", muscleGroup: "Biceps", equipment: "Barbell" },
  { name: "Concentration Curl", category: "Arms", muscleGroup: "Biceps", equipment: "Dumbbell" },
  { name: "Cable Curl", category: "Arms", muscleGroup: "Biceps", equipment: "Cable" },
  { name: "Tricep Pushdown", category: "Arms", muscleGroup: "Triceps", equipment: "Cable" },
  { name: "Overhead Tricep Extension", category: "Arms", muscleGroup: "Triceps", equipment: "Dumbbell" },
  { name: "Skull Crushers", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell" },
  { name: "Close-Grip Bench Press", category: "Arms", muscleGroup: "Triceps", equipment: "Barbell" },
  { name: "Diamond Push-Ups", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight" },
  { name: "Tricep Dips", category: "Arms", muscleGroup: "Triceps", equipment: "Bodyweight" },
  { name: "Wrist Curls", category: "Arms", muscleGroup: "Forearms", equipment: "Dumbbell" },

  // Core
  { name: "Plank", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight" },
  { name: "Side Plank", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight" },
  { name: "Crunches", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight" },
  { name: "Russian Twists", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight" },
  { name: "Hanging Leg Raise", category: "Core", muscleGroup: "Lower Abdominals", equipment: "Bodyweight" },
  { name: "Ab Wheel Rollout", category: "Core", muscleGroup: "Abdominals", equipment: "Ab Wheel" },
  { name: "Cable Woodchops", category: "Core", muscleGroup: "Obliques", equipment: "Cable" },
  { name: "Dead Bug", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight" },
  { name: "Mountain Climbers", category: "Core", muscleGroup: "Abdominals", equipment: "Bodyweight" },
  { name: "Bicycle Crunches", category: "Core", muscleGroup: "Obliques", equipment: "Bodyweight" },

  // Cardio
  { name: "Treadmill Run", category: "Cardio", muscleGroup: "Full Body", equipment: "Treadmill" },
  { name: "Rowing Machine", category: "Cardio", muscleGroup: "Full Body", equipment: "Rower" },
  { name: "Cycling", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Bike" },
  { name: "Jump Rope", category: "Cardio", muscleGroup: "Full Body", equipment: "Jump Rope" },
  { name: "Burpees", category: "Cardio", muscleGroup: "Full Body", equipment: "Bodyweight" },
  { name: "Box Jumps", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Plyo Box" },
  { name: "Battle Ropes", category: "Cardio", muscleGroup: "Full Body", equipment: "Battle Ropes" },
  { name: "Stairmaster", category: "Cardio", muscleGroup: "Quadriceps", equipment: "Machine" },
  { name: "Kettlebell Swing", category: "Cardio", muscleGroup: "Posterior Chain", equipment: "Kettlebell" },
  { name: "Sled Push", category: "Cardio", muscleGroup: "Full Body", equipment: "Sled" },
];

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;

  // Check how many already exist to avoid duplicates
  const existing = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const toCreate = DEFAULT_EXERCISES.filter(
    (ex) => !existingNames.has(ex.name.toLowerCase())
  );

  if (toCreate.length === 0) {
    return NextResponse.json({ message: "Library already seeded", added: 0 });
  }

  await prisma.exerciseLibrary.createMany({
    data: toCreate.map((ex) => ({
      name: ex.name,
      category: ex.category,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      tenantId,
    })),
  });

  return NextResponse.json({ message: "Library seeded", added: toCreate.length });
}
