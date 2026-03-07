"use client";

import { useState, useMemo, useEffect } from "react";
import {
  UtensilsCrossed,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Check,
  FileDown,
} from "lucide-react";
import { TemplatePickerModal } from "./template-picker-modal";
import { FoodPicker } from "./food-picker";
import { AIGenerateMealPlan } from "@/components/ai/ai-generate-meal-plan";
import type { Food, AssignedMealPlan, FoodInput, MealInput } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { scalePortionFoodInput, computeMealTotals } from "@/lib/portion-scaling";

interface ClientNutritionTabProps {
  clientId: string;
  assignedMealPlans: AssignedMealPlan[];
  onRefresh: () => void;
}

interface FormState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  meals: MealInput[];
}

function emptyForm(t: any): FormState {
  return {
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    meals: [
      { tempId: "b", name: t.nutrition.breakfast, time: "07:30", foods: [] },
      { tempId: "l", name: t.nutrition.lunch, time: "12:30", foods: [] },
      { tempId: "d", name: t.nutrition.dinner, time: "19:00", foods: [] },
    ],
  };
}

function mealsToPayload(meals: MealInput[]) {
  return meals
    .filter((m) => m.name.trim())
    .map((m, i) => ({
      name: m.name,
      time: m.time || null,
      foods: m.foods.filter((f) => f.name.trim()).map((f) => ({
        name: f.name,
        portion: f.portion,
        calories: f.calories ? parseInt(f.calories) : null,
        protein: f.protein ? parseInt(f.protein) : null,
        carbs: f.carbs ? parseInt(f.carbs) : null,
        fat: f.fat ? parseInt(f.fat) : null,
      })),
      orderIndex: i,
    }));
}

function planToFormState(plan: AssignedMealPlan): FormState {
  const source = plan.clientMeals.length > 0 ? plan.clientMeals : plan.mealPlan.meals;
  return {
    name: plan.customName || plan.mealPlan.name,
    calories: plan.mealPlan.targetCalories?.toString() || "",
    protein: plan.mealPlan.targetProtein?.toString() || "",
    carbs: plan.mealPlan.targetCarbs?.toString() || "",
    fat: plan.mealPlan.targetFat?.toString() || "",
    meals: source.map((m) => ({
      tempId: m.id,
      name: m.name,
      time: m.time || "",
      foods: (m.foods as Food[]).map((f: any) => ({
        name: f.name || "",
        portion: f.portion || "",
        calories: f.calories?.toString() || "",
        protein: f.protein?.toString() || "",
        carbs: f.carbs?.toString() || "",
        fat: f.fat?.toString() || "",
      })),
    })),
  };
}

export function ClientNutritionTab({ clientId, assignedMealPlans, onRefresh }: ClientNutritionTabProps) {
  const { toastSuccess, toastError } = useToast();
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(
    assignedMealPlans.length > 0 ? assignedMealPlans[0].id : null
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDescription, setCustomDescription] = useState("");
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Unified form state for both create and edit
  const [form, setForm] = useState<FormState>(emptyForm(t));

  const totals = useMemo(() => computeMealTotals(form.meals), [form.meals]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      calories: totals.calories ? totals.calories.toString() : "",
      protein: totals.protein ? totals.protein.toString() : "",
      carbs: totals.carbs ? totals.carbs.toString() : "",
      fat: totals.fat ? totals.fat.toString() : "",
    }));
  }, [totals]);

  function updateFormField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setMeals(meals: MealInput[]) {
    setForm((f) => ({ ...f, meals }));
  }

  function updateFood(mealIdx: number, foodIdx: number, field: string, value: string) {
    setMeals(
      form.meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return {
          ...m,
          foods: m.foods.map((f, fi) => {
            if (fi !== foodIdx) return f;
            if (field === "portion") {
              return { ...f, ...scalePortionFoodInput(f, value) };
            }
            return { ...f, [field]: value };
          }),
        };
      })
    );
  }

  async function handleAssignTemplate(templateId: string) {
    try {
      await api.post(`/api/clients/${clientId}/nutrition`, { mealPlanId: templateId });
      toastSuccess(t.nutrition.mealPlanAssigned);
    } catch {
      toastError(t.nutrition.failedToAssign);
    }
    setShowTemplatePicker(false);
    onRefresh();
  }

  async function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/clients/${clientId}/nutrition`, {
        name: form.name,
        targetCalories: form.calories ? parseInt(form.calories) : null,
        targetProtein: form.protein ? parseInt(form.protein) : null,
        targetCarbs: form.carbs ? parseInt(form.carbs) : null,
        targetFat: form.fat ? parseInt(form.fat) : null,
        meals: mealsToPayload(form.meals),
      });
      toastSuccess(t.nutrition.customMealPlanCreated);
      setShowCustomForm(false);
      setForm(emptyForm(t));
      onRefresh();
    } catch {
      toastError(t.nutrition.failedToCreate);
    }
    setSaving(false);
  }

  function startEdit(plan: AssignedMealPlan) {
    setEditingPlanId(plan.id);
    setForm(planToFormState(plan));
  }

  async function handleSaveEdit(planId: string) {
    setSaving(true);
    try {
      await api.put(`/api/clients/${clientId}/nutrition/${planId}`, {
        customName: form.name,
        targetCalories: form.calories ? parseInt(form.calories) : null,
        targetProtein: form.protein ? parseInt(form.protein) : null,
        targetCarbs: form.carbs ? parseInt(form.carbs) : null,
        targetFat: form.fat ? parseInt(form.fat) : null,
        meals: mealsToPayload(form.meals),
      });
      toastSuccess(t.nutrition.mealPlanSaved);
      setEditingPlanId(null);
      onRefresh();
    } catch {
      toastError(t.nutrition.failedToSave);
    }
    setSaving(false);
  }

  async function handleDelete(planId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/nutrition/${planId}`);
      toastSuccess(t.nutrition.mealPlanRemoved);
      onRefresh();
    } catch {
      toastError(t.nutrition.failedToRemove);
    }
  }

  function renderMealEditor() {
    const { meals } = form;
    return (
      <div className="space-y-3">
        {meals.map((meal, mi) => (
          <div key={meal.tempId} className="rounded-lg border border-gray-200 p-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={meal.name}
                  onChange={(e) => setMeals(meals.map((m, i) => (i === mi ? { ...m, name: e.target.value } : m)))}
                  className="input"
                  placeholder={t.nutrition.mealNamePlaceholder}
                />
              </div>
              <div className="w-24">
                <input
                  type="time"
                  value={meal.time}
                  onChange={(e) => setMeals(meals.map((m, i) => (i === mi ? { ...m, time: e.target.value } : m)))}
                  className="input"
                />
              </div>
              {meals.length > 1 && (
                <button
                  type="button"
                  onClick={() => setMeals(meals.filter((_, i) => i !== mi))}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {meal.foods.length > 0 && (
                <div className="grid grid-cols-6 gap-2 px-0.5">
                  <div className="col-span-2 text-[10px] font-medium text-gray-400">{t.nutrition.foodName}</div>
                  <div className="text-[10px] font-medium text-gray-400">{t.nutrition.portion}</div>
                  <div className="text-[10px] font-medium text-gray-400">{t.nutrition.calories}</div>
                  <div className="text-[10px] font-medium text-gray-400">{t.nutrition.protein}</div>
                  <div className="text-[10px] font-medium text-gray-400">{t.nutrition.fat}</div>
                </div>
              )}
              {meal.foods.map((food, fi) => (
                <div key={fi} className="grid grid-cols-6 gap-2">
                  <div className="col-span-2">
                    <FoodPicker
                      variant="inline"
                      inputClassName="input text-xs"
                      placeholder="Food"
                      initialValue={food.name}
                      onSelect={(result) => {
                        setMeals(
                          meals.map((m, i) =>
                            i === mi
                              ? {
                                  ...m,
                                  foods: m.foods.map((f, idx) =>
                                    idx === fi
                                      ? {
                                          name: result.name,
                                          portion: result.portion || f.portion,
                                          calories: result.calories?.toString() || f.calories,
                                          protein: result.protein?.toString() || f.protein,
                                          carbs: result.carbs?.toString() || f.carbs,
                                          fat: result.fat?.toString() || f.fat,
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
                  <input type="text" value={food.portion} onChange={(e) => updateFood(mi, fi, "portion", e.target.value)} className="input text-xs" placeholder="Portion" />
                  <input type="number" value={food.calories} onChange={(e) => updateFood(mi, fi, "calories", e.target.value)} className="input text-xs" placeholder="Cal" />
                  <input type="number" value={food.protein} onChange={(e) => updateFood(mi, fi, "protein", e.target.value)} className="input text-xs" placeholder="P" />
                  <div className="flex gap-1">
                    <input type="number" value={food.fat} onChange={(e) => updateFood(mi, fi, "fat", e.target.value)} className="input text-xs" placeholder="F" />
                    <button type="button" onClick={() => {
                      setMeals(meals.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                    }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
              ))}
              <FoodPicker
                variant="inline"
                inputClassName="input text-xs"
                placeholder={t.nutrition.addFoodItem}
                onSelect={(food) => {
                  setMeals(
                    meals.map((m, i) =>
                      i === mi
                        ? {
                            ...m,
                            foods: [
                              ...m.foods,
                              {
                                name: food.name,
                                portion: food.portion || "",
                                calories: food.calories?.toString() || "",
                                protein: food.protein?.toString() || "",
                                carbs: food.carbs?.toString() || "",
                                fat: food.fat?.toString() || "",
                                unitLabel: food.unitLabel,
                                gramsPerUnit: food.gramsPerUnit,
                              },
                            ],
                          }
                        : m
                    )
                  );
                }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setMeals([...meals, { tempId: Math.random().toString(36).slice(2), name: "", time: "", foods: [] }])}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
        >
          <Plus className="h-4 w-4" />
          {t.nutrition.addMeal}
        </button>
      </div>
    );
  }

  function renderMacroFields() {
    return (
      <div className="grid grid-cols-4 gap-3">
        <div><label className="text-xs text-gray-500">{t.nutrition.calories}</label><input type="number" value={form.calories} onChange={(e) => updateFormField("calories", e.target.value)} className="input mt-0.5" placeholder="1800" /></div>
        <div><label className="text-xs text-gray-500">{t.nutrition.protein}</label><input type="number" value={form.protein} onChange={(e) => updateFormField("protein", e.target.value)} className="input mt-0.5" placeholder="150" /></div>
        <div><label className="text-xs text-gray-500">{t.nutrition.carbs}</label><input type="number" value={form.carbs} onChange={(e) => updateFormField("carbs", e.target.value)} className="input mt-0.5" placeholder="180" /></div>
        <div><label className="text-xs text-gray-500">{t.nutrition.fat}</label><input type="number" value={form.fat} onChange={(e) => updateFormField("fat", e.target.value)} className="input mt-0.5" placeholder="60" /></div>
      </div>
    );
  }

  if (assignedMealPlans.length === 0 && !showCustomForm) {
    return (
      <div>
        <div className="card flex flex-col items-center py-8 text-center">
          <UtensilsCrossed className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.nutrition.noPlansAssigned}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className="btn-primary">
              <FileDown className="mr-2 h-4 w-4" />
              {t.nutrition.assignFromTemplate}
            </button>
            <button
              onClick={() => {
                setShowCustomForm(true);
                setForm(emptyForm(t));
              }}
              className="btn-secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.nutrition.createCustomPlanBtn}
            </button>
          </div>
        </div>
        {showTemplatePicker && (
          <TemplatePickerModal type="nutrition" onSelect={handleAssignTemplate} onClose={() => setShowTemplatePicker(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.nutrition.mealPlans} ({assignedMealPlans.length})
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplatePicker(true)} className="btn-secondary text-sm">
            <FileDown className="mr-1 h-4 w-4" />
            {t.nutrition.fromTemplate}
          </button>
          <button
            onClick={() => {
              setShowCustomForm(true);
              setForm(emptyForm(t));
            }}
            className="btn-primary text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t.nutrition.customPlanLabel}
          </button>
        </div>
      </div>

      {/* Custom Plan Form */}
      {showCustomForm && (
        <div className="card mb-4 border-2 border-orange-200">
          <form onSubmit={handleCreateCustom}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{t.nutrition.newCustomMealPlan}</h4>
              <button type="button" onClick={() => setShowCustomForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <input type="text" required value={form.name} onChange={(e) => updateFormField("name", e.target.value)} placeholder={t.nutrition.planName} className="input" />
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={t.nutrition.aiPromptPlaceholder}
                className="input text-sm"
              />
              <div className="mt-1.5">
                <AIGenerateMealPlan
                  prompt={customDescription}
                  onGenerate={(data) => {
                    setForm({
                      name: data.name || form.name,
                      calories: data.targetCalories,
                      protein: data.targetProtein,
                      carbs: data.targetCarbs,
                      fat: data.targetFat,
                      meals: data.meals.map((m) => ({
                        tempId: Math.random().toString(36).slice(2),
                        name: m.name,
                        time: m.time || "",
                        foods: m.foods.map((f) => ({
                          name: f.name,
                          portion: f.portion || "100g",
                          calories: f.calories?.toString() || "",
                          protein: f.protein?.toString() || "",
                          carbs: f.carbs?.toString() || "",
                          fat: f.fat?.toString() || "",
                        })),
                      })),
                    });
                  }}
                />
              </div>
            </div>
            <div className="mt-3">{renderMacroFields()}</div>
            <div className="mt-3">{renderMealEditor()}</div>
            <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? t.nutrition.creating : t.nutrition.createMealPlan}
            </button>
          </form>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-3">
        {assignedMealPlans.map((plan) => {
          const isOpen = expanded === plan.id;
          const isEditing = editingPlanId === plan.id;
          const meals = plan.clientMeals.length > 0 ? plan.clientMeals : plan.mealPlan.meals;
          const displayName = plan.customName || plan.mealPlan.name;

          return (
            <div key={plan.id} className="card">
              <button
                onClick={() => setExpanded(isOpen ? null : plan.id)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                    <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{displayName}</h3>
                    <div className="flex gap-2 text-xs text-gray-500">
                      {plan.mealPlan.sourceTemplate && (
                        <span>{t.nutrition.from}: {plan.mealPlan.sourceTemplate.name}</span>
                      )}
                      {plan.mealPlan.targetCalories && <span>{plan.mealPlan.targetCalories} {t.nutrition.kcal}</span>}
                      <span>{meals.length} {t.nutrition.meals_count}</span>
                    </div>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {isOpen && !isEditing && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="mb-3 flex gap-2">
                    <button onClick={() => startEdit(plan)} className="btn-secondary text-xs">
                      <Pencil className="mr-1 h-3 w-3" />
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      {t.nutrition.remove}
                    </button>
                  </div>

                  {plan.mealPlan.targetCalories && (
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                        {plan.mealPlan.targetCalories} {t.nutrition.kcal}
                      </span>
                      {plan.mealPlan.targetProtein && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">P: {plan.mealPlan.targetProtein}g</span>
                      )}
                      {plan.mealPlan.targetCarbs && (
                        <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">C: {plan.mealPlan.targetCarbs}g</span>
                      )}
                      {plan.mealPlan.targetFat && (
                        <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">F: {plan.mealPlan.targetFat}g</span>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {meals.map((meal) => (
                      <div key={meal.id} className="rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{meal.name}</p>
                          {meal.time && <span className="text-xs text-gray-400">{meal.time}</span>}
                        </div>
                        {(meal.foods as Food[]).map((food: any, fi: number) => (
                          <div key={fi} className="mt-1 flex justify-between text-sm">
                            <span className="text-gray-700">
                              {food.name}
                              {food.portion && <span className="text-gray-400"> — {food.portion}</span>}
                            </span>
                            {food.calories && <span className="text-xs text-gray-400">{food.calories} {t.nutrition.kcal}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOpen && isEditing && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="mb-3">
                    <label className="text-xs text-gray-500">{t.nutrition.planName}</label>
                    <input type="text" value={form.name} onChange={(e) => updateFormField("name", e.target.value)} className="input mt-0.5" />
                  </div>
                  <div className="mb-3">{renderMacroFields()}</div>
                  {renderMealEditor()}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleSaveEdit(plan.id)} disabled={saving} className="btn-primary text-sm">
                      <Check className="mr-1 h-4 w-4" />
                      {saving ? t.common.saving : t.workouts.saveChanges}
                    </button>
                    <button onClick={() => setEditingPlanId(null)} className="btn-secondary text-sm">{t.common.cancel}</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showTemplatePicker && (
        <TemplatePickerModal type="nutrition" onSelect={handleAssignTemplate} onClose={() => setShowTemplatePicker(false)} />
      )}
    </div>
  );
}
