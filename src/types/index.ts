export interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
  videoUrl: string | null;
}

export interface ClientExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
  videoUrl: string | null;
}

export interface ExerciseInput {
  tempId: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
  videoUrl: string;
}

export interface Food {
  name: string;
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  /** e.g. "egg", "breast", "cup" — present when portion is unit-based */
  unitLabel?: string;
  /** gram weight of 1 unit — used to scale macros when quantity changes */
  gramsPerUnit?: number;
}

export interface Meal {
  id: string;
  name: string;
  description: string | null;
  time: string | null;
  foods: Food[];
  orderIndex: number;
}

export interface ClientMeal {
  id: string;
  name: string;
  description: string | null;
  time: string | null;
  foods: Food[];
  orderIndex: number;
  notes: string | null;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  method: string | null;
  status: string;
  period: string | null;
  description: string | null;
  notes: string | null;
}

export interface LibraryExercise {
  id: string;
  name: string;
  nameBs: string | null;
  nameI18n: Record<string, string> | null;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
}

// Shared domain types used across dashboard/portal pages

export interface ProgressPhoto {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

export interface Measurement {
  id: string;
  date: string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
  notes: string | null;
}

export interface AssignedWorkoutPlan {
  id: string;
  customName: string | null;
  notes: string | null;
  mode: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  pausedAt: string | null;
  accessPolicy: string;
  allowDownload: boolean;
  clientWorkoutProgramId: string | null;
  workoutPlan: {
    id: string;
    name: string;
    description: string | null;
    sourceTemplate: { id: string; name: string } | null;
    exercises: Exercise[];
  };
  clientExercises: ClientExercise[];
}

export interface WorkoutProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  workoutPlanId: string | null;
  workoutPlan: { id: string; name: string; description: string | null } | null;
}

export interface WorkoutProgramSummary {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  isTemplate: boolean;
  dayCount: number;
  assignedCount: number;
}

export interface WorkoutProgramDetail {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  isTemplate: boolean;
  createdAt: string;
  days: WorkoutProgramDay[];
  assignments: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
    accessPolicy: string;
    isActive: boolean;
    currentWeek: number;
    currentDay: number;
    client: { id: string; name: string; status: string };
  }>;
}

export interface AssignedWorkoutProgram {
  id: string;
  startDate: string;
  endDate: string | null;
  accessPolicy: string;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  notes: string | null;
  program: {
    id: string;
    name: string;
    description: string | null;
    durationWeeks: number;
    daysPerWeek: number;
    days: WorkoutProgramDay[];
  };
  clientWorkoutPlans: AssignedWorkoutPlan[];
}

export interface NutritionProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  mealPlanId: string | null;
  mealPlan: { id: string; name: string; description: string | null } | null;
}

export interface NutritionProgramSummary {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  mealsPerDay: number;
  isTemplate: boolean;
  dayCount: number;
  assignedCount: number;
}

export interface NutritionProgramDetail {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  mealsPerDay: number;
  isTemplate: boolean;
  createdAt: string;
  days: NutritionProgramDay[];
  assignments: Array<{
    id: string;
    startDate: string;
    endDate: string | null;
    accessPolicy: string;
    isActive: boolean;
    currentWeek: number;
    currentDay: number;
    client: { id: string; name: string; status: string };
  }>;
}

export interface AssignedNutritionProgram {
  id: string;
  startDate: string;
  endDate: string | null;
  accessPolicy: string;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  notes: string | null;
  program: {
    id: string;
    name: string;
    description: string | null;
    durationWeeks: number;
    mealsPerDay: number;
    days: NutritionProgramDay[];
  };
  clientMealPlans: AssignedMealPlan[];
}

export interface AssignedMealPlan {
  id: string;
  customName: string | null;
  notes: string | null;
  isActive: boolean;
  allowDownload: boolean;
  mealPlan: {
    id: string;
    name: string;
    description: string | null;
    targetCalories: number | null;
    targetProtein: number | null;
    targetCarbs: number | null;
    targetFat: number | null;
    sourceTemplate: { id: string; name: string } | null;
    meals: Meal[];
  };
  clientMeals: ClientMeal[];
}

export interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  height: number | null;
  goals: string | null;
  notes: string | null;
  allergies: string | null;
  dietaryPrefs: string | null;
  injuries: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  status: string;
  userId: string | null;
  createdAt: string;
  progressPhotos: ProgressPhoto[];
  measurements: Measurement[];
  assignedPlans: AssignedWorkoutPlan[];
  assignedMealPlans: AssignedMealPlan[];
}

export interface MealPlanSummary {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  mealCount: number;
  assignedCount: number;
}

export interface FoodInput {
  name: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  unitLabel?: string;
  gramsPerUnit?: number;
}

export interface MealInput {
  tempId: string;
  name: string;
  description: string;
  time: string;
  foods: FoodInput[];
}

export interface ClientOption {
  id: string;
  name: string;
}

export interface NutritionLog {
  id: string;
  date: string;
  mealName: string;
  foods: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
}

export interface AssignedHabit {
  id: string;
  habit: { id: string; name: string; icon: string | null };
  logs: Array<{ date: string; completed: boolean }>;
}

export interface HabitTemplate {
  id: string;
  name: string;
  icon: string | null;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string | null;
  year: number | null;
  description: string | null;
  imageUrl: string | null;
  orderIndex: number;
}

export interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration: string | null;
  features: string[] | null;
  isActive: boolean;
  isFeatured: boolean;
  orderIndex: number;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  preferredSlot: string | null;
  status: string;
  createdAt: string;
}

export interface CoachPublicProfile {
  name: string;
  slug: string;
  logo: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  coachPhoto: string | null;
  socialLinks: Record<string, string> | null;
  specialties: string[] | null;
  certificates: Certificate[];
  packages: Package[];
}

export interface CheckInQuestion {
  id: string;
  question: string;
  type: string;
}

export interface CheckInAnswer {
  questionId: string;
  answer: string;
}

export interface TrainingGroup {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    members: number;
    sessions: number;
  };
}

export interface TrainingGroupDetail extends TrainingGroup {
  members: Array<{
    id: string;
    joinedAt: string;
    client: { id: string; name: string; email: string | null };
  }>;
  sessions: GroupSession[];
}

export interface GroupSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  status: string;
  maxParticipants: number;
  isOpen: boolean;
  groupId: string | null;
  workoutPlanId: string | null;
  group?: { id: string; name: string } | null;
  workoutPlan?: { id: string; name: string } | null;
  _count?: {
    participants: number;
  };
}

export interface GroupSessionDetail extends GroupSession {
  participants: Array<{
    id: string;
    status: string;
    enrolledAt: string;
    client: { id: string; name: string; email: string | null };
    clientWorkoutPlanId: string | null;
  }>;
}
