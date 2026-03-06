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
  time: string | null;
  foods: Food[];
  orderIndex: number;
}

export interface ClientMeal {
  id: string;
  name: string;
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
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
}
