"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { ExerciseInput } from "@/types";

interface GeneratedExercise {
  name: string;
  nameEn: string;
  sets: number;
  reps: string;
  weight: string;
  restSeconds: number;
  notes: string;
  videoUrl?: string;
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
  const [includeVideos, setIncludeVideos] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [refinement, setRefinement] = useState("");
  const [refinements, setRefinements] = useState<string[]>([]);

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      // Build prompt with all refinements
      const allRefinements = [...refinements];
      if (refinement.trim()) allRefinements.push(refinement.trim());

      const fullPrompt = allRefinements.length > 0
        ? `${prompt.trim()}\n\nAdditional instructions:\n${allRefinements.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : prompt.trim();

      const res = await fetch("/api/ai/generate-workout-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: fullPrompt, locale, includeVideos }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }

      const plan: GeneratedPlan = await res.json();

      const exercises: ExerciseInput[] = plan.exercises.map((ex) => ({
        tempId: Math.random().toString(36).slice(2),
        name: ex.name,
        sets: ex.sets?.toString() || "3",
        reps: ex.reps || "8-12",
        weight: ex.weight || "",
        restSeconds: ex.restSeconds?.toString() || "60",
        notes: ex.notes || "",
        videoUrl: ex.videoUrl || "",
      }));

      onGenerate({
        name: plan.name,
        description: plan.description,
        exercises,
      });

      // Track refinement history
      if (refinement.trim()) {
        setRefinements((prev) => [...prev, refinement.trim()]);
      }
      setHasGenerated(true);
      setRefinement("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg && msg !== "Failed" ? msg : t.workouts.aiError);
    } finally {
      setLoading(false);
    }
  }

  function removeRefinement(index: number) {
    setRefinements((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-1.5">
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
              {hasGenerated ? t.workouts.regenerateWithAI || "Regenerate" : t.workouts.generateWithAI}
            </>
          )}
        </button>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={includeVideos}
            onChange={(e) => setIncludeVideos(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-3.5 w-3.5"
          />
          {t.workouts.includeVideo}
        </label>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      {hasGenerated && (
        <>
          <input
            type="text"
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
            placeholder={t.workouts.refinePromptPlaceholder || "Refine: e.g. 'add more leg exercises', 'reduce rest times'..."}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200"
          />
          {refinements.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {refinements.map((r, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  {r}
                  <button type="button" onClick={() => removeRefinement(i)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
