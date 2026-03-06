import type { Food, FoodInput } from "@/types";

interface ScalableFood {
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  unitLabel?: string;
  gramsPerUnit?: number;
}

function scaleNum(val: number | null, ratio: number): number | null {
  return val != null ? Math.round(val * ratio) : null;
}

function scaleStr(val: string, ratio: number): string {
  const n = parseInt(val);
  return isNaN(n) ? val : Math.round(n * ratio).toString();
}

export function scalePortionFood(food: ScalableFood, newPortion: string): Partial<ScalableFood> {
  // Unit-based portions: detect qty change, auto-update grams & macros
  if (food.gramsPerUnit && food.unitLabel) {
    const oldQty = parseInt(food.portion) || 1;
    const newQty = parseInt(newPortion) || oldQty;
    if (newQty !== oldQty && newQty > 0) {
      const ratio = newQty / oldQty;
      const totalGrams = newQty * food.gramsPerUnit;
      return {
        portion: `${newQty} ${food.unitLabel} (${Math.round(totalGrams)}g)`,
        calories: scaleNum(food.calories, ratio),
        protein: scaleNum(food.protein, ratio),
        carbs: scaleNum(food.carbs, ratio),
        fat: scaleNum(food.fat, ratio),
      };
    }
    return { portion: newPortion };
  }

  // Plain gram portions: scale when grams change
  const oldG = food.portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  const newG = newPortion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  if (oldG && newG) {
    const ratio = parseFloat(newG[1]) / parseFloat(oldG[1]);
    if (ratio > 0 && ratio !== 1) {
      return {
        portion: newPortion,
        calories: scaleNum(food.calories, ratio),
        protein: scaleNum(food.protein, ratio),
        carbs: scaleNum(food.carbs, ratio),
        fat: scaleNum(food.fat, ratio),
      };
    }
  }

  return { portion: newPortion };
}

export function scalePortionFoodInput(food: FoodInput, newPortion: string): Partial<FoodInput> {
  if (food.gramsPerUnit && food.unitLabel) {
    const oldQty = parseInt(food.portion) || 1;
    const newQty = parseInt(newPortion) || oldQty;
    if (newQty !== oldQty && newQty > 0) {
      const ratio = newQty / oldQty;
      const totalGrams = newQty * food.gramsPerUnit;
      return {
        portion: `${newQty} ${food.unitLabel} (${Math.round(totalGrams)}g)`,
        calories: scaleStr(food.calories, ratio),
        protein: scaleStr(food.protein, ratio),
        carbs: scaleStr(food.carbs, ratio),
        fat: scaleStr(food.fat, ratio),
      };
    }
    return { portion: newPortion };
  }

  const oldG = food.portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  const newG = newPortion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
  if (oldG && newG) {
    const ratio = parseFloat(newG[1]) / parseFloat(oldG[1]);
    if (ratio > 0 && ratio !== 1) {
      return {
        portion: newPortion,
        calories: scaleStr(food.calories, ratio),
        protein: scaleStr(food.protein, ratio),
        carbs: scaleStr(food.carbs, ratio),
        fat: scaleStr(food.fat, ratio),
      };
    }
  }

  return { portion: newPortion };
}

export function computeMealTotals(meals: Array<{ foods: FoodInput[] }>) {
  let cal = 0, p = 0, c = 0, f = 0;
  for (const meal of meals) {
    for (const food of meal.foods) {
      cal += parseInt(food.calories) || 0;
      p += parseInt(food.protein) || 0;
      c += parseInt(food.carbs) || 0;
      f += parseInt(food.fat) || 0;
    }
  }
  return { calories: cal, protein: p, carbs: c, fat: f };
}

export function computeFoodTotals(meals: Array<{ foods: Food[] }>) {
  let cal = 0, p = 0, c = 0, f = 0;
  for (const meal of meals) {
    for (const food of meal.foods) {
      cal += food.calories || 0;
      p += food.protein || 0;
      c += food.carbs || 0;
      f += food.fat || 0;
    }
  }
  return { calories: cal, protein: p, carbs: c, fat: f };
}
