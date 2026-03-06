"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Dumbbell, Search, Zap } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  exerciseCount: number;
  assignedCount: number;
}

const PRESET_TEMPLATES = [
  {
    name: "Full Body",
    description: "Complete full body workout targeting all major muscle groups",
    isTemplate: true,
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: "Keep chest up, break parallel", videoUrl: null, orderIndex: 0 },
      { name: "Bench Press", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: "Touch chest, control the descent", videoUrl: null, orderIndex: 1 },
      { name: "Bent Over Row", sets: 4, reps: "8-12", weight: null, restSeconds: 60, notes: "Squeeze shoulder blades together", videoUrl: null, orderIndex: 2 },
      { name: "Overhead Press", sets: 3, reps: "8-10", weight: null, restSeconds: 60, notes: "Brace core, press straight up", videoUrl: null, orderIndex: 3 },
      { name: "Romanian Deadlift", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: "Hinge at hips, slight knee bend", videoUrl: null, orderIndex: 4 },
      { name: "Plank", sets: 3, reps: "45-60s", weight: null, restSeconds: 45, notes: "Keep body in a straight line", videoUrl: null, orderIndex: 5 },
    ],
  },
  {
    name: "Upper Body",
    description: "Chest, back, shoulders and arms",
    isTemplate: true,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6-8", weight: null, restSeconds: 90, notes: "Arch back slightly, feet flat", videoUrl: null, orderIndex: 0 },
      { name: "Pull-Ups", sets: 4, reps: "6-10", weight: null, restSeconds: 90, notes: "Full range of motion", videoUrl: null, orderIndex: 1 },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: "30-45 degree incline", videoUrl: null, orderIndex: 2 },
      { name: "Cable Row", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: "Pull to lower chest", videoUrl: null, orderIndex: 3 },
      { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: "Slight bend in elbows", videoUrl: null, orderIndex: 4 },
      { name: "Bicep Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: "No swinging", videoUrl: null, orderIndex: 5 },
      { name: "Tricep Pushdowns", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: "Keep elbows pinned", videoUrl: null, orderIndex: 6 },
    ],
  },
  {
    name: "Lower Body",
    description: "Quads, hamstrings, glutes and calves",
    isTemplate: true,
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "6-8", weight: null, restSeconds: 120, notes: "Break parallel, drive through heels", videoUrl: null, orderIndex: 0 },
      { name: "Romanian Deadlift", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: "Feel hamstring stretch", videoUrl: null, orderIndex: 1 },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10-12 each", weight: null, restSeconds: 60, notes: "Back foot on bench", videoUrl: null, orderIndex: 2 },
      { name: "Leg Curl", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: "Slow eccentric", videoUrl: null, orderIndex: 3 },
      { name: "Leg Extension", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: "Pause at top", videoUrl: null, orderIndex: 4 },
      { name: "Calf Raises", sets: 4, reps: "15-20", weight: null, restSeconds: 45, notes: "Full stretch at bottom", videoUrl: null, orderIndex: 5 },
    ],
  },
  {
    name: "Push Day",
    description: "Chest, shoulders and triceps",
    isTemplate: true,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6-8", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 0 },
      { name: "Overhead Press", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 1 },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Cable Flyes", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: "Squeeze at the top", videoUrl: null, orderIndex: 3 },
      { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
    ],
  },
  {
    name: "Pull Day",
    description: "Back, biceps and rear delts",
    isTemplate: true,
    exercises: [
      { name: "Deadlift", sets: 4, reps: "5-6", weight: null, restSeconds: 120, notes: "Brace core, keep bar close", videoUrl: null, orderIndex: 0 },
      { name: "Pull-Ups", sets: 4, reps: "6-10", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 1 },
      { name: "Barbell Row", sets: 3, reps: "8-10", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Face Pulls", sets: 3, reps: "15-20", weight: null, restSeconds: 45, notes: "Pull to forehead level", videoUrl: null, orderIndex: 3 },
      { name: "Barbell Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Hammer Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
    ],
  },
];

export default function WorkoutsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/workouts")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createFromPreset(preset: (typeof PRESET_TEMPLATES)[0]) {
    setCreating(preset.name);
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    });
    if (res.ok) {
      const plan = await res.json();
      router.push(`/dashboard/workouts/${plan.id}/edit`);
    }
    setCreating(null);
  }

  const filtered = plans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workout Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Reusable templates — assign to clients from their profile page
          </p>
        </div>
        <Link href="/dashboard/workouts/new" className="btn-primary">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">New Plan</span>
        </Link>
      </div>

      {/* Quick Start Presets */}
      <div className="mt-6">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Zap className="h-4 w-4 text-amber-500" />
          Quick Start from Template
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_TEMPLATES.map((preset) => (
            <button
              key={preset.name}
              onClick={() => createFromPreset(preset)}
              disabled={creating !== null}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            >
              {creating === preset.name ? "Creating..." : preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search workout plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Dumbbell}
            title="No workout plans yet"
            description="Create your first workout plan or use a quick start template above."
            action={
              <Link href="/dashboard/workouts/new" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 stagger-in">
          {filtered.map((plan) => (
            <Link
              key={plan.id}
              href={`/dashboard/workouts/${plan.id}`}
              className="card transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Dumbbell className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {plan.description && (
                      <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>
                {plan.isTemplate && (
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                    Template
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-4 text-xs text-gray-500">
                <span>{plan.exerciseCount} exercises</span>
                <span>{plan.assignedCount} clients</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
