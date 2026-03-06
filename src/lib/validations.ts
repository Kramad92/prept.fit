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
  sets: z.any().optional(),
  reps: z.any().optional(),
  weight: z.any().optional(),
  restSeconds: z.any().optional(),
  notes: z.any().optional(),
  videoUrl: z.any().optional(),
  orderIndex: z.number().optional(),
}).passthrough();

export const workoutPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.any().optional(),
  isTemplate: z.boolean().optional().default(false),
  exercises: z.array(exerciseSchema).optional().default([]),
});

const mealFoodSchema = z.object({
  name: z.string(),
  portion: z.string().optional().default(""),
  calories: z.any().optional(),
  protein: z.any().optional(),
  carbs: z.any().optional(),
  fat: z.any().optional(),
}).passthrough();

const mealSchema = z.object({
  name: z.string().min(1),
  time: z.any().optional(),
  foods: z.array(mealFoodSchema).optional().default([]),
  orderIndex: z.number().optional(),
}).passthrough();

export const mealPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.any().optional(),
  isTemplate: z.boolean().optional().default(false),
  targetCalories: z.any().optional(),
  targetProtein: z.any().optional(),
  targetCarbs: z.any().optional(),
  targetFat: z.any().optional(),
  meals: z.array(mealSchema).optional().default([]),
});

export const settingsUpdateSchema = z.object({
  name: z.any().optional(),
  bio: z.any().optional(),
  phone: z.any().optional(),
  email: z.any().optional(),
  website: z.any().optional(),
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
