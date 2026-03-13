"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";

interface GeneratedDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutPlanId: string | null;
  workoutName: string | null;
}

interface GeneratedProgram {
  name: string;
  description: string;
  days: GeneratedDay[];
}

interface AIGenerateProgramProps {
  prompt: string;
  durationWeeks: number;
  daysPerWeek: number;
  onGenerate: (data: GeneratedProgram) => void;
}

export function AIGenerateProgram({
  prompt,
  durationWeeks,
  daysPerWeek,
  onGenerate,
}: AIGenerateProgramProps) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [refinement, setRefinement] = useState("");

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const fullPrompt = refinement.trim()
        ? `${prompt.trim()}\n\nAdditional instructions: ${refinement.trim()}`
        : prompt.trim();

      const res = await fetch("/api/ai/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          locale,
          durationWeeks,
          daysPerWeek,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }

      const program: GeneratedProgram = await res.json();
      onGenerate(program);

      setHasGenerated(true);
      setRefinement("");
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed" ? e.message : t.programs.aiError);
    } finally {
      setLoading(false);
    }
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
              {t.programs.generating}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {hasGenerated ? t.programs.regenerateWithAI || "Regenerate" : t.programs.generateWithAI}
            </>
          )}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
      {hasGenerated && (
        <input
          type="text"
          value={refinement}
          onChange={(e) => setRefinement(e.target.value)}
          placeholder={t.programs.refinePromptPlaceholder || "Refine: e.g. 'more rest days between leg workouts'..."}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-200"
        />
      )}
    </div>
  );
}
