// Types matching the Next.js API response shapes

export interface ClientExercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  videoUrl: string | null;
  orderIndex: number;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  videoUrl: string | null;
  orderIndex: number;
}

export interface Food {
  name: string;
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  unitLabel?: string;
  gramsPerUnit?: number;
}

export interface ClientMeal {
  id: string;
  name: string;
  time: string | null;
  foods: Food[];
  orderIndex: number;
  notes: string | null;
}

export interface Meal {
  id: string;
  name: string;
  time: string | null;
  foods: Food[];
  orderIndex: number;
}

export interface AssignedWorkoutPlan {
  id: string;
  customName: string | null;
  notes: string | null;
  mode: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  workoutPlan: {
    id: string;
    name: string;
    description: string | null;
    sourceTemplate: { id: string; name: string } | null;
    exercises: Exercise[];
  };
  clientExercises: ClientExercise[];
}

export interface AssignedMealPlan {
  id: string;
  customName: string | null;
  notes: string | null;
  isActive: boolean;
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

export interface ScheduleItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  notes: string | null;
}

export interface ProgressPhoto {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

export interface MeasurementData {
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

export interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  goals: string | null;
  notes: string | null;
  status: string;
  tenant: {
    name: string;
    brandColor: string;
    logo: string | null;
  };
  progressPhotos: ProgressPhoto[];
  measurements: MeasurementData[];
  assignedPlans: AssignedWorkoutPlan[];
  assignedMealPlans: AssignedMealPlan[];
  schedules: ScheduleItem[];
}

export interface AssignedHabit {
  id: string;
  clientId: string;
  habitId: string;
  isActive: boolean;
  assignedAt: string;
  habit: {
    id: string;
    name: string;
    icon: string | null;
  };
  logs: Array<{
    id: string;
    clientHabitId: string;
    date: string;
    completed: boolean;
  }>;
}

export interface WorkoutLogEntry {
  id: string;
  exerciseId: string;
  setNumber: number;
  repsCompleted: number | null;
  weightUsed: string | null;
  notes: string | null;
  completed: boolean;
  exercise: {
    id: string;
    name: string;
  };
}

export interface WorkoutLog {
  id: string;
  clientId: string;
  workoutPlanId: string;
  date: string;
  completed: boolean;
  duration: number | null;
  notes: string | null;
  workoutPlan: {
    id: string;
    name: string;
  };
  entries: WorkoutLogEntry[];
}

export interface NutritionLog {
  id: string;
  clientId: string;
  date: string;
  mealName: string;
  foods: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
}

export interface BookingSlot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface PaymentSummary {
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    date: string;
    dueDate: string | null;
    method: string | null;
    status: string;
    period: string | null;
    description: string | null;
  }>;
  summary: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
  };
}

// Phase 3: Communication & Tracking

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachmentUrl: string | null;
  attachmentType: string | null;
  attachmentName: string | null;
  senderId: string;
  clientId: string;
  tenantId: string;
  sender: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  };
}

export interface CheckInTemplate {
  id: string;
  name: string;
  questions: Array<{ id: string; question: string; type: string }>;
  frequency: string;
  isActive: boolean;
  createdAt: string;
  tenantId: string;
}

export interface CheckIn {
  id: string;
  answers: Array<{ questionId: string; answer: string }>;
  submittedAt: string;
  coachNotes: string | null;
  templateId: string;
  clientId: string;
  template?: {
    id: string;
    name: string;
    questions: Array<{ id: string; question: string; type: string }>;
  };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, string> | null;
  createdAt: string;
  userId: string;
  tenantId: string;
}

// Phase 4: Scheduling & Groups

export interface TrainingGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  joinedAt: string;
  nextSession?: {
    date: string;
    startTime: string;
  } | null;
}

export interface GroupSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  maxParticipants: number;
  isOpen: boolean;
  group: { id: string; name: string } | null;
  workoutPlan?: { id: string; name: string } | null;
  _count: { participants: number };
  participants: Array<{
    status: string;
    clientWorkoutPlanId: string | null;
  }>;
}

export interface GroupSessionsResponse {
  enrolled: GroupSession[];
  open: GroupSession[];
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
}

export interface PaymentResponse {
  payments: Payment[];
  summary: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
  };
}
