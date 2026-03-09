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

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai/generate-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
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
    } catch (e) {
      setError(e instanceof Error && e.message !== "Failed" ? e.message : t.programs.aiError);
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
            {t.programs.generating}
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.programs.generateWithAI}
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
