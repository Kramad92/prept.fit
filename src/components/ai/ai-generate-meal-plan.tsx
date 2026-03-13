"use client";

import { useState } from "react";
import { Sparkles, Loader2, X } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { Food } from "@/types";

interface GeneratedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedMeal {
  name: string;
  description: string;
  time: string;
  foods: GeneratedFood[];
}

interface GeneratedPlan {
  name: string;
  description: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  meals: GeneratedMeal[];
}

interface MealRow {
  name: string;
  description: string;
  time: string;
  foods: Food[];
}

interface AIGenerateMealPlanProps {
  /** The description/prompt text from the parent form */
  prompt: string;
  onGenerate: (data: {
    name: string;
    description: string;
    targetCalories: string;
    targetProtein: string;
    targetCarbs: string;
    targetFat: string;
    meals: MealRow[];
  }) => void;
}

export function AIGenerateMealPlan({ prompt, onGenerate }: AIGenerateMealPlanProps) {
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

      const body: Record<string, unknown> = { prompt: fullPrompt, locale };

      // Extract calorie target from prompt (e.g. "2200 calories", "2200 cal", "2200 kcal")
      const calMatch = prompt.match(/(\d{3,5})\s*(?:cal(?:ories?)?|kcal)/i);
      if (calMatch) body.targetCalories = parseInt(calMatch[1], 10);

      // Extract meal count from prompt (e.g. "5 meals", "5 meal")
      const mealMatch = prompt.match(/(\d{1,2})\s*meals?/i);
      if (mealMatch) body.numMeals = parseInt(mealMatch[1], 10);

      const res = await fetch("/api/ai/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }

      const plan: GeneratedPlan = await res.json();

      const meals: MealRow[] = plan.meals.map((m) => ({
        name: m.name,
        description: m.description || "",
        time: m.time || "",
        foods: m.foods.map((f) => ({
          name: f.name,
          portion: f.portion || "100g",
          calories: f.calories ?? null,
          protein: f.protein ?? null,
          carbs: f.carbs ?? null,
          fat: f.fat ?? null,
        })),
      }));

      onGenerate({
        name: plan.name,
        description: plan.description || "",
        targetCalories: plan.targetCalories?.toString() || "",
        targetProtein: plan.targetProtein?.toString() || "",
        targetCarbs: plan.targetCarbs?.toString() || "",
        targetFat: plan.targetFat?.toString() || "",
        meals,
      });

      // Track refinement history
      if (refinement.trim()) {
        setRefinements((prev) => [...prev, refinement.trim()]);
      }
      setHasGenerated(true);
      setRefinement("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg && msg !== "Failed" ? msg : t.nutrition.aiError);
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
              {t.nutrition.generating}
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {hasGenerated ? t.nutrition.regenerateWithAI || "Regenerate" : t.nutrition.generateWithAI}
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
            placeholder={t.nutrition.refinePromptPlaceholder || "Refine: e.g. 'swap chicken for fish', 'add more protein'..."}
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
