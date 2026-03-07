import { z } from "zod";
import { NextResponse } from "next/server";

export async function validateBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return {
        error: NextResponse.json(
          { error: "Validation failed", details: result.error.flatten().fieldErrors },
          { status: 400 }
        ),
      };
    }
    return { data: result.data };
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

// Helper: accept number or numeric string, output number | null
function numericNullable() {
  return z.preprocess(
    (v) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    },
    z.number().nullable()
  ) as z.ZodType<number | null>;
}

export const paymentCreateSchema = z.object({
  amount: z.union([z.string(), z.number()]),
  date: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  status: z.enum(["paid", "pending", "overdue", "cancelled"]).optional().default("paid"),
  period: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().optional(),
});

export const paymentUpdateSchema = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  date: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  status: z.enum(["paid", "pending", "overdue", "cancelled"]).optional(),
  period: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  currency: z.string().optional(),
});

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  gender: z.string().nullable().optional(),
  goals: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const clientUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  gender: z.string().nullable().optional(),
  goals: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "inactive", "paused"]).optional(),
});

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: numericNullable(),
  reps: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  restSeconds: numericNullable(),
  notes: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  orderIndex: z.number().optional(),
});

export const workoutPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().nullable().optional(),
  isTemplate: z.boolean().optional().default(false),
  exercises: z.array(exerciseSchema).optional().default([]),
});

const mealFoodSchema = z.object({
  name: z.string(),
  portion: z.string().optional().default(""),
  calories: numericNullable(),
  protein: numericNullable(),
  carbs: numericNullable(),
  fat: numericNullable(),
  unitLabel: z.string().optional(),
  gramsPerUnit: z.number().optional(),
});

const mealSchema = z.object({
  name: z.string().min(1),
  time: z.string().nullable().optional(),
  foods: z.array(mealFoodSchema).optional().default([]),
  orderIndex: z.number().optional(),
});

export const mealPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().nullable().optional(),
  isTemplate: z.boolean().optional().default(false),
  targetCalories: numericNullable(),
  targetProtein: numericNullable(),
  targetCarbs: numericNullable(),
  targetFat: numericNullable(),
  meals: z.array(mealSchema).optional().default([]),
});

export const settingsUpdateSchema = z.object({
  name: z.string().max(200).optional(),
  bio: z.string().max(5000).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().max(500).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
  timezone: z.string().max(100).optional(),
  locale: z.enum(["bs", "en"]).optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  currency: z.string().max(10).optional(),
});

export const measurementCreateSchema = z.object({
  date: z.string().optional(),
  weight: z.union([z.string(), z.number()]).optional(),
  bodyFat: z.union([z.string(), z.number()]).optional(),
  chest: z.union([z.string(), z.number()]).optional(),
  waist: z.union([z.string(), z.number()]).optional(),
  hips: z.union([z.string(), z.number()]).optional(),
  arms: z.union([z.string(), z.number()]).optional(),
  thighs: z.union([z.string(), z.number()]).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Schemas for previously unvalidated routes

export const messageCreateSchema = z.object({
  content: z.string().min(1).max(5000),
});

export const habitCreateSchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().max(10).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const habitLogSchema = z.object({
  clientHabitId: z.string().min(1),
  date: z.string().min(1),
  completed: z.boolean(),
});

export const habitAssignSchema = z.object({
  clientId: z.string().min(1),
  habitIds: z.array(z.string().min(1)).min(1),
});

export const checkInTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  questions: z.array(z.string().min(1)).min(1),
  frequency: z.string().max(50).optional().default("weekly"),
});

export const checkInSubmitSchema = z.object({
  templateId: z.string().min(1),
  answers: z.array(z.string()),
});

export const checkInNotesSchema = z.object({
  coachNotes: z.string().max(5000).nullable(),
});

export const nutritionLogCreateSchema = z.object({
  mealName: z.string().min(1).max(200),
  foods: z.string().max(5000),
  calories: numericNullable(),
  protein: numericNullable(),
  carbs: numericNullable(),
  fat: numericNullable(),
  notes: z.string().max(2000).nullable().optional(),
});

export const photoCreateSchema = z.object({
  key: z.string().min(1),
  caption: z.string().max(500).optional(),
  category: z.string().max(50).nullable().optional(),
});

export const photoUpdateSchema = z.object({
  photoId: z.string().min(1),
  caption: z.string().max(500).optional(),
  category: z.string().max(50).nullable().optional(),
});

export const bookingCreateSchema = z.object({
  scheduleId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  notes: z.string().max(2000).optional(),
});

export const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
});

export const scheduleCreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  duration: z.number().min(5).max(480),
  price: numericNullable(),
  maxClients: z.number().min(1).optional().default(1),
  availability: z.array(availabilitySchema).optional().default([]),
});

export const exerciseLibrarySchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(100).nullable().optional(),
  muscleGroup: z.string().max(100).nullable().optional(),
  equipment: z.string().max(100).nullable().optional(),
});

export const foodLibrarySchema = z.object({
  name: z.string().min(1).max(200),
  portion: z.string().max(100).optional().default(""),
  calories: numericNullable(),
  protein: numericNullable(),
  carbs: numericNullable(),
  fat: numericNullable(),
  category: z.string().max(100).nullable().optional(),
});

export const workoutLogSchema = z.object({
  clientWorkoutPlanId: z.string().min(1),
  date: z.string().optional(),
  duration: z.number().optional(),
  notes: z.string().max(2000).optional(),
  entries: z.array(z.object({
    exerciseName: z.string().min(1),
    sets: z.number().optional(),
    reps: z.string().optional(),
    weight: z.string().optional(),
    notes: z.string().optional(),
  })).optional().default([]),
});

export const notificationMarkReadSchema = z.object({
  ids: z.array(z.string().min(1)),
});
