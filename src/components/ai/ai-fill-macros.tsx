"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import type { Food } from "@/types";

interface FoodMacros {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealRow {
  name: string;
  description: string;
  time: string;
  foods: Food[];
}

interface AIFillMacrosProps {
  meals: MealRow[];
  onFilled: (meals: MealRow[]) => void;
}

export function AIFillMacros({ meals, onFilled }: AIFillMacrosProps) {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);

  // Collect all foods that have a name but missing macros
  const foodsToFill = meals.flatMap((m) =>
    m.foods.filter((f) => f.name.trim() && (f.calories == null || f.calories === 0))
  );

  async function handleFill() {
    if (loading) return;

    // Collect ALL foods with names (not just missing macros) for batch fill
    const allFoods = meals.flatMap((m) =>
      m.foods.filter((f) => f.name.trim())
    );

    if (allFoods.length === 0) return;

    setLoading(true);

    try {
      const res = await fetch("/api/ai/fill-macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foods: allFoods.map((f) => ({
            name: f.name,
            portion: f.portion || "100g",
          })),
          locale,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      const filled: FoodMacros[] = await res.json();

      // Build a lookup by name+portion for matching
      const lookup = new Map<string, FoodMacros>();
      filled.forEach((f) => lookup.set(`${f.name}||${f.portion}`, f));

      // Update meals with filled macros
      let fillIndex = 0;
      const updatedMeals = meals.map((meal) => ({
        ...meal,
        foods: meal.foods.map((food) => {
          if (!food.name.trim()) return food;

          // Try to match by position (same order as sent)
          const filledFood = filled[fillIndex];
          fillIndex++;

          if (!filledFood) return food;

          return {
            ...food,
            portion: food.portion || filledFood.portion,
            calories: filledFood.calories,
            protein: filledFood.protein,
            carbs: filledFood.carbs,
            fat: filledFood.fat,
          };
        }),
      }));

      onFilled(updatedMeals);
    } catch {
      // Silent fail — user can retry
    } finally {
      setLoading(false);
    }
  }

  // Only show if there are foods typed in
  const hasFoods = meals.some((m) => m.foods.some((f) => f.name.trim()));
  if (!hasFoods) return null;

  return (
    <button
      type="button"
      onClick={handleFill}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50"
    >
      {loading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t.nutrition.fillingMacros}
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          {t.nutrition.fillMacros}
        </>
      )}
    </button>
  );
}
