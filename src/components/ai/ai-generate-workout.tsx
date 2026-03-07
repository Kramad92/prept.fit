"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { ExerciseInput } from "@/types";

interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  restSeconds: number;
  notes: string;
}

interface GeneratedPlan {
  name: string;
  description: string;
  exercises: GeneratedExercise[];
}

interface AIGenerateWorkoutProps {
  /** The description/prompt text from the parent form */
  prompt: string;
  onGenerate: (data: {
    name: string;
    description: string;
    exercises: ExerciseInput[];
  }) => void;
}

export function AIGenerateWorkout({ prompt, onGenerate }: AIGenerateWorkoutProps) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/generate-workout-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), locale }),
      });

      if (!res.ok) throw new Error("Failed");

      const plan: GeneratedPlan = await res.json();

      const exercises: ExerciseInput[] = plan.exercises.map((ex) => ({
        tempId: Math.random().toString(36).slice(2),
        name: ex.name,
        sets: ex.sets?.toString() || "3",
        reps: ex.reps || "8-12",
        weight: ex.weight || "",
        restSeconds: ex.restSeconds?.toString() || "60",
        notes: ex.notes || "",
        videoUrl: "",
      }));

      onGenerate({
        name: plan.name,
        description: plan.description,
        exercises,
      });
    } catch {
      setError(t.workouts.aiError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!prompt.trim() || loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t.workouts.generating}
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.workouts.generateWithAI}
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
