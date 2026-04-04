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
  description: string | null;
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

export interface WorkoutProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  workoutPlanId: string | null;
  workoutPlan: { id: string; name: string; description: string | null } | null;
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

export interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  height: number | null;
  goals: string | null;
  notes: string | null;
  status: string;
  tenant: {
    name: string;
    brandColor: string;
    logo: string | null;
    coachPhoto: string | null;
  };
  progressPhotos: ProgressPhoto[];
  measurements: Measurement[];
  assignedPlans: AssignedWorkoutPlan[];
  assignedMealPlans: AssignedMealPlan[];
  assignedPrograms: AssignedWorkoutProgram[];
  assignedNutritionPrograms: AssignedNutritionProgram[];
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

export interface BookingSlot {
  date: string;
  startTime: string;
  endTime: string;
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
  notes: string | null;
  clientId: string;
  client?: { id: string; name: string };
}

export interface PaymentResponse {
  payments: Payment[];
  summary: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
  };
}

// Phase 6: Coach types

export interface CoachDashboard {
  clientCount: number;
  totalClients: number;
  planCount: number;
  mealPlanCount: number;
  weekSessions: number;
  todaySessions: CoachSession[];
  recentClients: Array<{
    id: string;
    name: string;
    status: string;
    goals: string | null;
  }>;
  payments: {
    pendingCount: number;
    pendingTotal: number;
    overdueCount: number;
    overdueTotal: number;
    monthCollected: number;
    monthCount: number;
    pendingList: CoachPaymentItem[];
    overdueList: CoachPaymentItem[];
  };
  profileStats: {
    incomplete: Array<{
      id: string;
      name: string;
      filled: number;
      total: number;
      hasPortalAccess: boolean;
    }>;
    incompleteCount: number;
    noPortalCount: number;
    totalActive: number;
  };
  unreadMessages: {
    total: number;
    byClient: Array<{
      clientId: string;
      clientName: string;
      count: number;
      latest: string;
    }>;
  };
  birthdays: Array<{
    id: string;
    name: string;
    date: string;
    daysUntil: number;
    turningAge: number;
  }>;
  expiringPlans: Array<{
    id: string;
    clientName: string;
    clientId: string;
    planName: string;
    endDate: string | null;
  }>;
  weeklyWorkoutCompletion: {
    logged: number;
    activePlans: number;
  };
  checkIns: Array<{
    id: string;
    clientName: string;
    clientId: string;
    submittedAt: string;
  }>;
  activityFeed: Array<{
    type: "payment" | "workout" | "checkin" | "message";
    text: string;
    detail: string | null;
    date: string;
  }>;
}

export interface CoachSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName: string;
}

export interface CoachPaymentItem {
  id: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  description: string | null;
  clientName: string;
  clientId: string;
}

export interface ClientListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  status: string;
  goals: string | null;
  createdAt: string;
  _count: {
    progressPhotos: number;
    assignedPlans: number;
  };
}

export interface ClientDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  height: number | null;
  status: string;
  goals: string | null;
  notes: string | null;
  allergies: string | null;
  dietaryPrefs: string | null;
  injuries: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  userId: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  progressPhotos: Array<{
    id: string;
    url: string;
    takenAt: string;
    notes: string | null;
  }>;
  measurements: Measurement[];
  assignedPlans: AssignedWorkoutPlan[];
  assignedMealPlans: AssignedMealPlan[];
}

export interface CoachScheduleItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  notes: string | null;
  clientId: string;
  clientName: string;
}

export interface CoachPaymentsResponse {
  payments: Array<{
    id: string;
    clientId: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    dueDate: string | null;
    description: string | null;
    client: {
      id: string;
      name: string;
      email: string | null;
    };
  }>;
  summary: {
    totalCollected: number;
    totalPending: number;
    totalOverdue: number;
    totalPayments: number;
  };
}

export interface CoachTrainingGroup {
  id: string;
  name: string;
  description: string | null;
  maxParticipants: number;
  createdAt: string;
  _count: {
    members: number;
    sessions: number;
  };
}

export interface CoachGroupSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  maxParticipants: number;
  isOpen: boolean;
  status: string;
  group: { id: string; name: string } | null;
  workoutPlan: { id: string; name: string } | null;
  _count: { participants: number };
}

export interface CoachGroupSessionDetail extends CoachGroupSession {
  participants: Array<{
    id: string;
    sessionId: string;
    clientId: string;
    status: string;
    enrolledAt: string;
    client: {
      id: string;
      name: string;
      email: string | null;
    };
  }>;
}

export interface LatestMessagesMap {
  [clientId: string]: {
    content: string;
    createdAt: string;
  };
}

export interface UnreadCountsMap {
  [clientId: string]: number;
}

// Coach management types

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  brandColor: string;
  timezone: string;
  locale: string;
  units: string;
  currency: string;
  bio: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  coachPhoto: string | null;
  socialLinks: Record<string, string> | null;
  specialties: string[] | null;
  landingPageEnabled: boolean;
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

export interface CoachPackage {
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
  status: "new" | "contacted" | "archived";
  createdAt: string;
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  nameI18n: Record<string, string> | null;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  videoUrl: string | null;
  instructions: string | null;
  difficulty: string | null;
  bodyRegion: string | null;
  secondaryMuscles: string | null;
  secondaryEquipment: string | null;
}

export interface ExerciseCategory {
  id: string;
  name: string;
}

export interface EquipmentType {
  id: string;
  name: string;
}

export interface WorkoutPlanListItem {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  exerciseCount: number;
  assignedCount: number;
}

export interface WorkoutPlanDetail {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  exercises: Exercise[];
}

export interface MealPlanListItem {
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

export interface MealPlanDetail {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  meals: Meal[];
}

export interface HabitTemplate {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
}

export interface ProgramListItem {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  isTemplate: boolean;
  dayCount: number;
  assignedCount: number;
}

export interface NutritionProgramListItem {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  mealsPerDay: number;
  isTemplate: boolean;
  dayCount: number;
  assignedCount: number;
}

export interface SearchResults {
  clients: Array<{ id: string; name: string; email: string; status: string }>;
  exercises: Array<{ id: string; name: string; category: string; muscleGroup: string }>;
  workoutPlans: Array<{ id: string; name: string; description: string }>;
  mealPlans: Array<{ id: string; name: string; description: string }>;
}

export interface FoodSearchResult {
  fdcId?: number;
  id?: string;
  name: string;
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source?: string;
  unitLabel?: string;
  gramsPerUnit?: number;
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
