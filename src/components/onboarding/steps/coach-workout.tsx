"use client";

import { useState } from "react";
import { Dumbbell, Sparkles, Check, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../onboarding-wizard";

const PRESET_TEMPLATES = [
  {
    name: "Full Body",
    description: "All major muscle groups",
    exerciseCount: 6,
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
    description: "Chest, back, shoulders & arms",
    exerciseCount: 7,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6-8", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 0 },
      { name: "Pull-Ups", sets: 4, reps: "6-10", weight: null, restSeconds: 90, notes: "Full range of motion", videoUrl: null, orderIndex: 1 },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Cable Row", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 3 },
      { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Bicep Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
      { name: "Tricep Pushdowns", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 6 },
    ],
  },
  {
    name: "Lower Body",
    description: "Quads, hamstrings, glutes & calves",
    exerciseCount: 6,
    exercises: [
      { name: "Barbell Squat", sets: 4, reps: "6-8", weight: null, restSeconds: 120, notes: null, videoUrl: null, orderIndex: 0 },
      { name: "Romanian Deadlift", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 1 },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10-12 each", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Leg Curl", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 3 },
      { name: "Leg Extension", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Calf Raises", sets: 4, reps: "15-20", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
    ],
  },
  {
    name: "Push Day",
    description: "Chest, shoulders & triceps",
    exerciseCount: 6,
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6-8", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 0 },
      { name: "Overhead Press", sets: 4, reps: "8-10", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 1 },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Cable Flyes", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 3 },
      { name: "Lateral Raises", sets: 3, reps: "12-15", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Overhead Tricep Extension", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
    ],
  },
  {
    name: "Pull Day",
    description: "Back, biceps & rear delts",
    exerciseCount: 6,
    exercises: [
      { name: "Deadlift", sets: 4, reps: "5-6", weight: null, restSeconds: 120, notes: null, videoUrl: null, orderIndex: 0 },
      { name: "Pull-Ups", sets: 4, reps: "6-10", weight: null, restSeconds: 90, notes: null, videoUrl: null, orderIndex: 1 },
      { name: "Barbell Row", sets: 3, reps: "8-10", weight: null, restSeconds: 60, notes: null, videoUrl: null, orderIndex: 2 },
      { name: "Face Pulls", sets: 3, reps: "15-20", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 3 },
      { name: "Barbell Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 4 },
      { name: "Hammer Curls", sets: 3, reps: "10-12", weight: null, restSeconds: 45, notes: null, videoUrl: null, orderIndex: 5 },
    ],
  },
];

type Mode = "choose" | "ai" | "creating" | "done";

export function CoachWorkout({ data, onUpdate }: StepProps) {
  const [mode, setMode] = useState<Mode>("choose");
  const [aiPrompt, setAiPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdPlan, setCreatedPlan] = useState<{ id: string; name: string; exerciseCount: number } | null>(null);

  async function createFromPreset(preset: typeof PRESET_TEMPLATES[0]) {
    setCreating(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          description: preset.description,
          isTemplate: true,
          exercises: preset.exercises,
        }),
      });
      if (res.ok) {
        const plan = await res.json();
        setCreatedPlan({ id: plan.id, name: preset.name, exerciseCount: preset.exerciseCount });
        setMode("done");
        onUpdate({ createdWorkoutId: plan.id });
      }
    } finally {
      setCreating(false);
    }
  }

  async function createFromAI() {
    if (!aiPrompt.trim()) return;
    setCreating(true);
    try {
      const genRes = await fetch("/api/ai/generate-workout-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, locale: "en" }),
      });
      if (!genRes.ok) throw new Error("Generation failed");
      const plan = await genRes.json();

      const exercises = plan.exercises.map((ex: any, i: number) => ({
        name: ex.name,
        sets: ex.sets || 3,
        reps: ex.reps || "8-12",
        weight: ex.weight || null,
        restSeconds: ex.restSeconds || 60,
        notes: ex.notes || null,
        videoUrl: ex.videoUrl || null,
        orderIndex: i,
      }));

      const saveRes = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plan.name,
          description: plan.description,
          isTemplate: true,
          exercises,
        }),
      });
      if (saveRes.ok) {
        const saved = await saveRes.json();
        setCreatedPlan({ id: saved.id, name: plan.name, exerciseCount: exercises.length });
        setMode("done");
        onUpdate({ createdWorkoutId: saved.id });
      }
    } catch {
      // fall back to choose mode
    } finally {
      setCreating(false);
    }
  }

  if (mode === "done" && createdPlan) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">Workout Created!</h2>
        <p className="mt-1 text-sm text-gray-500">
          &ldquo;{createdPlan.name}&rdquo; with {createdPlan.exerciseCount} exercises
        </p>
        <a
          href={`/dashboard/workouts/${createdPlan.id}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Customize in editor &rarr;
        </a>
      </div>
    );
  }

  if (mode === "ai") {
    return (
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Generate with AI</h2>
        <p className="mt-1 text-sm text-gray-500">
          Describe the workout you want and we&apos;ll generate it for you.
        </p>
        <Textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g., Full body strength workout for beginners, 45 minutes, bodyweight and dumbbells only..."
          rows={4}
          className="mt-4"
        />
        <div className="mt-4 flex gap-3">
          <Button variant="outline" onClick={() => setMode("choose")} disabled={creating}>
            Back
          </Button>
          <Button onClick={createFromAI} disabled={creating || !aiPrompt.trim()}>
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate & Create
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Create Your First Workout</h2>
      <p className="mt-1 text-sm text-gray-500">
        Pick a template to get started or generate one with AI.
      </p>

      <div className="mt-5 space-y-2">
        {PRESET_TEMPLATES.map((preset) => (
          <button
            key={preset.name}
            onClick={() => createFromPreset(preset)}
            disabled={creating}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <Dumbbell className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">{preset.name}</p>
                <p className="text-xs text-gray-500">{preset.description} &middot; {preset.exerciseCount} exercises</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        onClick={() => setMode("ai")}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-blue-300 hover:text-blue-600"
      >
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </button>
    </div>
  );
}
