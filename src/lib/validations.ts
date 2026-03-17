import { z } from "zod";
import { NextResponse } from "next/server";

// Shared password validation: min 10 chars, at least one letter and one number
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128)
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  businessName: z.string().min(1, "Business name is required").max(200),
  email: z.string().email(),
  password: passwordSchema,
});

export const inviteAcceptSchema = z.object({
  password: passwordSchema,
});

export const clientInviteSchema = z.object({
  method: z.enum(["email", "password"]).optional().default("email"),
  password: z.string().min(10).max(128).optional(),
});

export const mobileLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});

export const adminTenantUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  planTier: z.enum(["free", "starter", "pro", "enterprise"]).optional(),
});

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

const clientProfileFields = {
  allergies: z.string().max(1000).nullable().optional(),
  dietaryPrefs: z.string().max(1000).nullable().optional(),
  injuries: z.string().max(1000).nullable().optional(),
  fitnessLevel: z.string().nullable().optional(),
  activityLevel: z.string().nullable().optional(),
};

export const clientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  gender: z.string().nullable().optional(),
  goals: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  ...clientProfileFields,
});

export const clientUpdateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().max(50).nullable().optional(),
  gender: z.string().nullable().optional(),
  goals: z.string().max(2000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "inactive", "paused", "archived"]).optional(),
  ...clientProfileFields,
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
  description: z.string().nullable().optional(),
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
  timezone: z.string().max(100).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional(),
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
  content: z.string().max(5000),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(["image", "file"]).optional(),
  attachmentName: z.string().max(500).optional(),
});

export const habitCreateSchema = z.object({
  name: z.string().min(1).max(200),
  icon: z.string().max(10).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const habitUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  icon: z.string().max(10).nullable().optional(),
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
  clientId: z.string().min(1).optional(),
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

export const equipmentTypeSchema = z.object({
  name: z.string().min(1).max(100),
});

export const exerciseCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export const exerciseLibrarySchema = z.object({
  name: z.string().min(1).max(200),
  nameI18n: z.record(z.string().max(200)).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  muscleGroup: z.string().max(100).nullable().optional(),
  equipment: z.string().max(100).nullable().optional(),
  videoUrl: z.string().max(500).nullable().optional(),
  instructions: z.string().max(5000).nullable().optional(),
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

export const workoutAssignSchema = z.object({
  clientId: z.string().min(1),
  workoutPlanId: z.string().min(1),
  mode: z.enum(["solo", "live"]).optional(),
  accessPolicy: z.enum(["unlimited", "date_range", "subscription_tied"]).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

const programDaySchema = z.object({
  weekNumber: z.number().min(1),
  dayNumber: z.number().min(1),
  label: z.string().max(100).nullable().optional(),
  workoutPlanId: z.string().nullable().optional(),
});

export const workoutProgramSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().nullable().optional(),
  durationWeeks: z.number().min(1).max(52).optional().default(4),
  daysPerWeek: z.number().min(1).max(7).optional().default(3),
  days: z.array(programDaySchema).optional().default([]),
});

export const workoutProgramAssignSchema = z.object({
  clientId: z.string().min(1),
  programId: z.string().min(1),
  startDate: z.string().min(1),
  accessPolicy: z.enum(["unlimited", "date_range", "subscription_tied"]).optional().default("date_range"),
  notes: z.string().max(2000).nullable().optional(),
});

const nutritionProgramDaySchema = z.object({
  weekNumber: z.number().min(1),
  dayNumber: z.number().min(1),
  label: z.string().max(100).nullable().optional(),
  mealPlanId: z.string().nullable().optional(),
});

export const nutritionProgramSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().nullable().optional(),
  durationWeeks: z.number().min(1).max(52).optional().default(4),
  mealsPerDay: z.number().min(1).max(10).optional().default(3),
  days: z.array(nutritionProgramDaySchema).optional().default([]),
});

export const nutritionProgramAssignSchema = z.object({
  clientId: z.string().min(1),
  programId: z.string().min(1),
  startDate: z.string().min(1),
  accessPolicy: z.enum(["unlimited", "date_range", "subscription_tied"]).optional().default("date_range"),
  notes: z.string().max(2000).nullable().optional(),
});

export const mealPlanAssignSchema = z.object({
  clientId: z.string().min(1),
  mealPlanId: z.string().min(1),
});

export const inquiryCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional(),
  message: z.string().min(1).max(5000),
  preferredSlot: z.string().max(200).optional(),
  _hp: z.string().max(0).optional(), // honeypot field
});

export const certificateSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().max(200).optional(),
  year: z.number().min(1900).max(2100).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().max(500).optional(),
  orderIndex: z.number().optional(),
});

export const packageSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  currency: z.string().max(10).optional(),
  duration: z.string().max(100).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  orderIndex: z.number().optional(),
});

export const landingPageSettingsSchema = z.object({
  landingPageEnabled: z.boolean().optional(),
  coachPhoto: z.string().max(500).nullable().optional(),
  specialties: z.array(z.string().max(100)).nullable().optional(),
  socialLinks: z.object({
    instagram: z.string().max(500).optional(),
    facebook: z.string().max(500).optional(),
    tiktok: z.string().max(500).optional(),
    youtube: z.string().max(500).optional(),
    twitter: z.string().max(500).optional(),
    linkedin: z.string().max(500).optional(),
  }).nullable().optional(),
});

export const inquiryUpdateSchema = z.object({
  status: z.enum(["new", "contacted", "archived"]),
});

export const trainingGroupCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  maxParticipants: z.number().min(1).max(200).optional().default(20),
});

export const trainingGroupUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  maxParticipants: z.number().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

export const groupMembersAddSchema = z.object({
  clientIds: z.array(z.string().min(1)).min(1),
});

const timeRegex = /^\d{2}:\d{2}$/;

export const groupSessionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(timeRegex),
  endTime: z.string().regex(timeRegex),
  location: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  maxParticipants: z.number().min(1).max(200).optional().default(20),
  isOpen: z.boolean().optional().default(false),
  groupId: z.string().nullable().optional(),
  workoutPlanId: z.string().nullable().optional(),
});

export const groupSessionUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(timeRegex).optional(),
  endTime: z.string().regex(timeRegex).optional(),
  location: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  maxParticipants: z.number().min(1).max(200).optional(),
  isOpen: z.boolean().optional(),
});

export const groupSessionEnrollSchema = z.object({
  clientId: z.string().min(1),
});

export const groupAttendanceSchema = z.object({
  participants: z.array(z.object({
    clientId: z.string().min(1),
    status: z.enum(["enrolled", "attended", "no-show", "cancelled"]),
  })),
});

export const groupWorkoutAssignSchema = z.object({
  workoutPlanId: z.string().min(1),
});
