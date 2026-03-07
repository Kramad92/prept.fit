"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const body: Record<string, unknown> = { prompt: prompt.trim(), locale };

      const res = await fetch("/api/ai/generate-meal-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed");

      const plan: GeneratedPlan = await res.json();

      const meals: MealRow[] = plan.meals.map((m) => ({
        name: m.name,
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
    } catch {
      setError(t.nutrition.aiError);
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
            {t.nutrition.generating}
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.nutrition.generateWithAI}
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
