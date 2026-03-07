"use client";

import { X, Trash2 } from "lucide-react";
import { FoodPicker } from "@/components/client/food-picker";
import { AIGenerateMealPlan } from "@/components/ai/ai-generate-meal-plan";
import { AIFillMacros } from "@/components/ai/ai-fill-macros";
import { useT } from "@/lib/i18n";
import { scalePortionFood } from "@/lib/portion-scaling";
import type { Food } from "@/types";

export interface MealRow {
  name: string;
  time: string;
  foods: Food[];
}

export interface FormState {
  name: string;
  description: string;
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
  meals: MealRow[];
}

interface NutritionPlanFormProps {
  form: FormState;
  editingPlanId: string | null;
  saving: boolean;
  onFormChange: (updater: (prev: FormState) => FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function NutritionPlanForm({
  form,
  editingPlanId,
  saving,
  onFormChange,
  onSubmit,
  onClose,
}: NutritionPlanFormProps) {
  const t = useT();

  function updateMeals(updater: (meals: MealRow[]) => MealRow[]) {
    onFormChange((prev) => ({ ...prev, meals: updater(prev.meals) }));
  }

  function updateFood(mealIndex: number, foodIndex: number, field: string, value: string) {
    updateMeals((prev) =>
      prev.map((m, mi) =>
        mi === mealIndex
          ? {
              ...m,
              foods: m.foods.map((f, fi) => {
                if (fi !== foodIndex) return f;
                if (field === "portion") {
                  return { ...f, ...scalePortionFood(f, value) };
                }
                return {
                  ...f,
                  [field]: ["calories", "protein", "carbs", "fat"].includes(field)
                    ? (value ? parseInt(value) : null)
                    : value,
                };
              }),
            }
          : m
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
      <div className="w-full max-w-2xl bg-white p-4 md:p-6 rounded-t-2xl md:rounded-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingPlanId ? t.nutrition.editMealPlan : t.nutrition.createMealPlan}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.nutrition.planName} *</label>
              <input type="text" required value={form.name} onChange={(e) => onFormChange((prev) => ({ ...prev, name: e.target.value }))} className="input mt-1" placeholder={t.nutrition.planNamePlaceholder} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t.common.description}</label>
              <input type="text" value={form.description} onChange={(e) => onFormChange((prev) => ({ ...prev, description: e.target.value }))} className="input mt-1" placeholder={t.nutrition.aiPromptPlaceholder} />
              <div className="mt-1.5">
                <AIGenerateMealPlan
                  prompt={form.description}
                  onGenerate={(data) => {
                    onFormChange((prev) => ({
                      ...prev,
                      name: data.name || prev.name,
                      targetCalories: data.targetCalories,
                      targetProtein: data.targetProtein,
                      targetCarbs: data.targetCarbs,
                      targetFat: data.targetFat,
                      meals: data.meals,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">{t.nutrition.calories}</label>
                <input type="number" value={form.targetCalories} onChange={(e) => onFormChange((prev) => ({ ...prev, targetCalories: e.target.value }))} className="input mt-1" placeholder="1800" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">{t.nutrition.proteinG}</label>
                <input type="number" value={form.targetProtein} onChange={(e) => onFormChange((prev) => ({ ...prev, targetProtein: e.target.value }))} className="input mt-1" placeholder="150" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">{t.nutrition.carbsG}</label>
                <input type="number" value={form.targetCarbs} onChange={(e) => onFormChange((prev) => ({ ...prev, targetCarbs: e.target.value }))} className="input mt-1" placeholder="180" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">{t.nutrition.fatG}</label>
                <input type="number" value={form.targetFat} onChange={(e) => onFormChange((prev) => ({ ...prev, targetFat: e.target.value }))} className="input mt-1" placeholder="60" />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-700">{t.nutrition.meals}</h3>
                  <AIFillMacros
                    meals={form.meals}
                    onFilled={(updatedMeals) => onFormChange((prev) => ({ ...prev, meals: updatedMeals }))}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateMeals((prev) => [...prev, { name: "", time: "", foods: [] }]);
                    setTimeout(() => {
                      const el = document.querySelector("[data-meal-end]");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 50);
                  }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  + {t.nutrition.addMeal}
                </button>
              </div>

              {form.meals.map((meal, mi) => (
                <div key={mi} className="mt-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={meal.name}
                        onChange={(e) => updateMeals((prev) => prev.map((m, i) => i === mi ? { ...m, name: e.target.value } : m))}
                        className="input"
                        placeholder={t.nutrition.mealNamePlaceholder}
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="time"
                        value={meal.time}
                        onChange={(e) => updateMeals((prev) => prev.map((m, i) => i === mi ? { ...m, time: e.target.value } : m))}
                        className="input"
                      />
                    </div>
                    {form.meals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => updateMeals((prev) => prev.filter((_, i) => i !== mi))}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {(meal.foods.length > 0) && (
                      <div className="hidden md:grid grid-cols-6 gap-2 px-0.5">
                        <div className="col-span-2 text-[10px] font-medium text-gray-400">{t.nutrition.foodItem}</div>
                        <div className="text-[10px] font-medium text-gray-400">{t.nutrition.portion}</div>
                        <div className="text-[10px] font-medium text-gray-400">{t.nutrition.calories}</div>
                        <div className="text-[10px] font-medium text-gray-400">{t.nutrition.protein}</div>
                        <div className="text-[10px] font-medium text-gray-400">{t.nutrition.fat}</div>
                      </div>
                    )}
                    {meal.foods.map((food, fi) => (
                      <div key={fi} className="rounded-lg border border-gray-100 p-2 md:border-0 md:p-0 md:rounded-none">
                        {/* Desktop: 6-col grid */}
                        <div className="hidden md:grid grid-cols-6 gap-2">
                          <div className="col-span-2">
                            <FoodPicker
                              variant="inline"
                              inputClassName="input text-xs"
                              placeholder={t.nutrition.foodItem}
                              initialValue={food.name}
                              onSelect={(result) => {
                                updateMeals((prev) =>
                                  prev.map((m, i) =>
                                    i === mi
                                      ? {
                                          ...m,
                                          foods: m.foods.map((f, idx) =>
                                            idx === fi
                                              ? {
                                                  name: result.name,
                                                  portion: result.portion || f.portion,
                                                  calories: result.calories ?? f.calories,
                                                  protein: result.protein ?? f.protein,
                                                  carbs: result.carbs ?? f.carbs,
                                                  fat: result.fat ?? f.fat,
                                                  unitLabel: result.unitLabel ?? f.unitLabel,
                                                  gramsPerUnit: result.gramsPerUnit ?? f.gramsPerUnit,
                                                }
                                              : f
                                          ),
                                        }
                                      : m
                                  )
                                );
                              }}
                            />
                          </div>
                          <input type="text" value={food.portion} onChange={(e) => updateFood(mi, fi, "portion", e.target.value)} className="input text-xs" placeholder={t.nutrition.portion} data-food-portion={`${mi}-${fi}`} onFocus={(e) => e.target.select()} />
                          <input type="number" value={food.calories ?? ""} onChange={(e) => updateFood(mi, fi, "calories", e.target.value)} className="input text-xs" placeholder={t.nutrition.cal} />
                          <input type="number" value={food.protein ?? ""} onChange={(e) => updateFood(mi, fi, "protein", e.target.value)} className="input text-xs" placeholder={t.nutrition.pG} />
                          <div className="flex gap-1">
                            <input type="number" value={food.fat ?? ""} onChange={(e) => updateFood(mi, fi, "fat", e.target.value)} className="input text-xs" placeholder={t.nutrition.fG} />
                            <button type="button" onClick={() => {
                              updateMeals((prev) => prev.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                            }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                        {/* Mobile: stacked layout */}
                        <div className="md:hidden space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1">
                              <FoodPicker
                                variant="inline"
                                inputClassName="input text-xs"
                                placeholder={t.nutrition.foodItem}
                                initialValue={food.name}
                                onSelect={(result) => {
                                  updateMeals((prev) =>
                                    prev.map((m, i) =>
                                      i === mi
                                        ? {
                                            ...m,
                                            foods: m.foods.map((f, idx) =>
                                              idx === fi
                                                ? {
                                                    name: result.name,
                                                    portion: result.portion || f.portion,
                                                    calories: result.calories ?? f.calories,
                                                    protein: result.protein ?? f.protein,
                                                    carbs: result.carbs ?? f.carbs,
                                                    fat: result.fat ?? f.fat,
                                                    unitLabel: result.unitLabel ?? f.unitLabel,
                                                    gramsPerUnit: result.gramsPerUnit ?? f.gramsPerUnit,
                                                  }
                                                : f
                                            ),
                                          }
                                        : m
                                    )
                                  );
                                }}
                              />
                            </div>
                            <button type="button" onClick={() => {
                              updateMeals((prev) => prev.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                            }} className="text-gray-400 hover:text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input type="text" value={food.portion} onChange={(e) => updateFood(mi, fi, "portion", e.target.value)} className="input text-xs" placeholder={t.nutrition.portion} data-food-portion-m={`${mi}-${fi}`} onFocus={(e) => e.target.select()} />
                            <input type="number" value={food.calories ?? ""} onChange={(e) => updateFood(mi, fi, "calories", e.target.value)} className="input text-xs" placeholder={t.nutrition.calories} />
                            <input type="number" value={food.protein ?? ""} onChange={(e) => updateFood(mi, fi, "protein", e.target.value)} className="input text-xs" placeholder={t.nutrition.proteinG} />
                            <input type="number" value={food.fat ?? ""} onChange={(e) => updateFood(mi, fi, "fat", e.target.value)} className="input text-xs" placeholder={t.nutrition.fatG} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {/* Add food -- typing triggers search */}
                    <div data-add-food={mi}>
                      <FoodPicker
                        variant="inline"
                        inputClassName="input text-xs"
                        placeholder={t.nutrition.addFoodItem}
                        onSelect={(food) => {
                          updateMeals((prev) =>
                            prev.map((m, i) =>
                              i === mi
                                ? {
                                    ...m,
                                    foods: [
                                      ...m.foods,
                                      {
                                        name: food.name,
                                        portion: food.portion || "",
                                        calories: food.calories ?? null,
                                        protein: food.protein ?? null,
                                        carbs: food.carbs ?? null,
                                        fat: food.fat ?? null,
                                        unitLabel: food.unitLabel,
                                        gramsPerUnit: food.gramsPerUnit,
                                      },
                                    ],
                                  }
                                : m
                            )
                          );
                          // Focus the portion field of the newly added food
                          setTimeout(() => {
                            const newIdx = form.meals[mi].foods.length;
                            const el = document.querySelector(`[data-food-portion="${mi}-${newIdx}"]`) as HTMLInputElement
                              || document.querySelector(`[data-food-portion-m="${mi}-${newIdx}"]`) as HTMLInputElement;
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                              el.focus();
                              el.select();
                            } else {
                              document.querySelector(`[data-add-food="${mi}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }, 50);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div data-meal-end />
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? t.common.saving : editingPlanId ? t.workouts.saveChanges : t.nutrition.createMealPlan}
            </button>
          </form>
      </div>
    </div>
  );
}
