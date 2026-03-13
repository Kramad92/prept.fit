"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
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

      // Track refinement history
      if (refinement.trim()) {
        setRefinements((prev) => [...prev, refinement.trim()]);
      }
      setHasGenerated(true);
      setRefinement("");
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed" ? e.message : t.programs.aiError);
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
        <>
          <input
            type="text"
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGenerate(); } }}
            placeholder={t.programs.refinePromptPlaceholder || "Refine: e.g. 'more rest days between leg workouts'..."}
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
