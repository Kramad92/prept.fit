"use client";

import { useState } from "react";
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
import type { Meal, ClientMeal, Food } from "@/types";
import { useToast } from "@/components/ui/toast";

interface AssignedMealPlan {
  id: string;
  customName: string | null;
  notes: string | null;
  isActive: boolean;
  mealPlan: {
    id: string;
    name: string;
    description: string | null;
    targetCalories: number | null;
    targetProtein: number | null;
    targetCarbs: number | null;
    targetFat: number | null;
    sourceTemplate: { id: string; name: string } | null;
    meals: Meal[];
  };
  clientMeals: ClientMeal[];
}

interface FoodInput {
  name: string;
  portion: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  unitLabel?: string;
  gramsPerUnit?: number;
}

interface MealInput {
  tempId: string;
  name: string;
  time: string;
  foods: FoodInput[];
}

interface ClientNutritionTabProps {
  clientId: string;
  assignedMealPlans: AssignedMealPlan[];
  onRefresh: () => void;
}

export function ClientNutritionTab({ clientId, assignedMealPlans, onRefresh }: ClientNutritionTabProps) {
  const { toastSuccess, toastError } = useToast();
  const [expanded, setExpanded] = useState<string | null>(
    assignedMealPlans.length > 0 ? assignedMealPlans[0].id : null
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Custom form
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customMeals, setCustomMeals] = useState<MealInput[]>([]);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editCalories, setEditCalories] = useState("");
  const [editProtein, setEditProtein] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editFat, setEditFat] = useState("");
  const [editMeals, setEditMeals] = useState<MealInput[]>([]);

  function createEmptyMeal(): MealInput {
    return {
      tempId: Math.random().toString(36).slice(2),
      name: "",
      time: "",
      foods: [],
    };
  }

  function defaultMeals(): MealInput[] {
    return [
      { tempId: "b", name: "Breakfast", time: "07:30", foods: [] },
      { tempId: "l", name: "Lunch", time: "12:30", foods: [] },
      { tempId: "d", name: "Dinner", time: "19:00", foods: [] },
    ];
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

  async function handleAssignTemplate(templateId: string) {
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId: templateId }),
      });
      if (res.ok) toastSuccess("Meal plan assigned");
      else toastError("Failed to assign meal plan");
    } catch {
      toastError("Failed to assign meal plan");
    }
    setShowTemplatePicker(false);
    onRefresh();
  }

  async function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName,
          targetCalories: customCalories ? parseInt(customCalories) : null,
          targetProtein: customProtein ? parseInt(customProtein) : null,
          targetCarbs: customCarbs ? parseInt(customCarbs) : null,
          targetFat: customFat ? parseInt(customFat) : null,
          meals: mealsToPayload(customMeals),
        }),
      });
      if (res.ok) {
        toastSuccess("Custom meal plan created");
        setShowCustomForm(false);
        setCustomName("");
        setCustomMeals([]);
        onRefresh();
      } else {
        toastError("Failed to create meal plan");
      }
    } catch {
      toastError("Failed to create meal plan");
    }
    setSaving(false);
  }

  function startEdit(plan: AssignedMealPlan) {
    const meals = plan.clientMeals.length > 0
      ? plan.clientMeals.map((m) => ({
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
        }))
      : plan.mealPlan.meals.map((m) => ({
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
        }));

    setEditingPlanId(plan.id);
    setEditName(plan.customName || plan.mealPlan.name);
    setEditCalories(plan.mealPlan.targetCalories?.toString() || "");
    setEditProtein(plan.mealPlan.targetProtein?.toString() || "");
    setEditCarbs(plan.mealPlan.targetCarbs?.toString() || "");
    setEditFat(plan.mealPlan.targetFat?.toString() || "");
    setEditMeals(meals);
  }

  async function handleSaveEdit(planId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/nutrition/${planId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customName: editName,
          targetCalories: editCalories ? parseInt(editCalories) : null,
          targetProtein: editProtein ? parseInt(editProtein) : null,
          targetCarbs: editCarbs ? parseInt(editCarbs) : null,
          targetFat: editFat ? parseInt(editFat) : null,
          meals: mealsToPayload(editMeals),
        }),
      });
      if (res.ok) {
        toastSuccess("Meal plan saved");
        setEditingPlanId(null);
        onRefresh();
      } else {
        toastError("Failed to save meal plan");
      }
    } catch {
      toastError("Failed to save meal plan");
    }
    setSaving(false);
  }

  async function handleDelete(planId: string) {
    try {
      await fetch(`/api/clients/${clientId}/nutrition/${planId}`, { method: "DELETE" });
      toastSuccess("Meal plan removed");
      onRefresh();
    } catch {
      toastError("Failed to remove meal plan");
    }
  }

  function parsePortionGrams(portion: string): number | null {
    const match = portion.match(/^(\d+(?:\.\d+)?)\s*g$/i);
    return match ? parseFloat(match[1]) : null;
  }

  function updateFoodQty(
    meals: MealInput[],
    setMeals: (v: MealInput[]) => void,
    mealIdx: number,
    foodIdx: number,
    qty: number
  ) {
    setMeals(
      meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return {
          ...m,
          foods: m.foods.map((f, fi) => {
            if (fi !== foodIdx || !f.gramsPerUnit) return f;
            const totalGrams = qty * f.gramsPerUnit;
            const oldMatch = f.portion.match(/\((\d+)g\)/);
            const oldGrams = oldMatch ? parseInt(oldMatch[1]) : f.gramsPerUnit;
            const ratio = totalGrams / oldGrams;
            const scale = (v: string) => {
              const n = parseInt(v);
              return isNaN(n) ? v : Math.round(n * ratio).toString();
            };
            return {
              ...f,
              portion: `${qty} ${f.unitLabel} (${Math.round(totalGrams)}g)`,
              calories: scale(f.calories),
              protein: scale(f.protein),
              carbs: scale(f.carbs),
              fat: scale(f.fat),
            };
          }),
        };
      })
    );
  }

  function updateFood(
    meals: MealInput[],
    setMeals: (v: MealInput[]) => void,
    mealIdx: number,
    foodIdx: number,
    field: string,
    value: string
  ) {
    setMeals(
      meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return {
          ...m,
          foods: m.foods.map((f, fi) => {
            if (fi !== foodIdx) return f;
            if (field === "portion") {
              const oldG = parsePortionGrams(f.portion);
              const newG = parsePortionGrams(value);
              if (oldG && newG && oldG !== newG) {
                const ratio = newG / oldG;
                const scale = (v: string) => {
                  const n = parseInt(v);
                  return isNaN(n) ? v : Math.round(n * ratio).toString();
                };
                return {
                  ...f,
                  portion: value,
                  calories: scale(f.calories),
                  protein: scale(f.protein),
                  carbs: scale(f.carbs),
                  fat: scale(f.fat),
                };
              }
              return { ...f, portion: value };
            }
            return { ...f, [field]: value };
          }),
        };
      })
    );
  }

  function renderMealEditor(meals: MealInput[], setMeals: (v: MealInput[]) => void) {
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
                  placeholder="Meal name (e.g., Breakfast)"
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
                  <div className="col-span-2 text-[10px] font-medium text-gray-400">Food</div>
                  <div className="text-[10px] font-medium text-gray-400">Portion</div>
                  <div className="text-[10px] font-medium text-gray-400">Calories</div>
                  <div className="text-[10px] font-medium text-gray-400">Protein</div>
                  <div className="text-[10px] font-medium text-gray-400">Fat</div>
                </div>
              )}
              {meal.foods.map((food, fi) => {
                const qtyMatch = food.unitLabel ? food.portion.match(/^(\d+(?:\.\d+)?)/) : null;
                const qty = qtyMatch ? parseFloat(qtyMatch[1]) : null;

                return (
                  <div key={fi} className="grid grid-cols-6 gap-2">
                    <div className="col-span-2">
                      <input type="text" value={food.name} onChange={(e) => updateFood(meals, setMeals, mi, fi, "name", e.target.value)} className="input text-xs" placeholder="Food" />
                    </div>
                    {food.unitLabel && food.gramsPerUnit ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={qty ?? 1}
                          onChange={(e) => updateFoodQty(meals, setMeals, mi, fi, Math.max(1, parseInt(e.target.value) || 1))}
                          className="input text-xs w-12 flex-shrink-0"
                        />
                        <span className="truncate text-[10px] text-gray-400">{food.unitLabel}</span>
                      </div>
                    ) : (
                      <input type="text" value={food.portion} onChange={(e) => updateFood(meals, setMeals, mi, fi, "portion", e.target.value)} className="input text-xs" placeholder="Portion" />
                    )}
                    <input type="number" value={food.calories} onChange={(e) => updateFood(meals, setMeals, mi, fi, "calories", e.target.value)} className="input text-xs" placeholder="Cal" />
                    <input type="number" value={food.protein} onChange={(e) => updateFood(meals, setMeals, mi, fi, "protein", e.target.value)} className="input text-xs" placeholder="P" />
                    <div className="flex gap-1">
                      <input type="number" value={food.fat} onChange={(e) => updateFood(meals, setMeals, mi, fi, "fat", e.target.value)} className="input text-xs" placeholder="F" />
                      <button type="button" onClick={() => {
                        setMeals(meals.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                      }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
              {/* Add food — typing triggers search */}
              <FoodPicker
                variant="inline"
                inputClassName="input text-xs"
                placeholder="+ Add food item..."
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
          onClick={() => setMeals([...meals, createEmptyMeal()])}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
        >
          <Plus className="h-4 w-4" />
          Add Meal
        </button>
      </div>
    );
  }

  if (assignedMealPlans.length === 0 && !showCustomForm) {
    return (
      <div>
        <div className="card flex flex-col items-center py-8 text-center">
          <UtensilsCrossed className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No meal plans assigned.</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className="btn-primary">
              <FileDown className="mr-2 h-4 w-4" />
              Assign from Template
            </button>
            <button
              onClick={() => {
                setShowCustomForm(true);
                setCustomMeals(defaultMeals());
              }}
              className="btn-secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Plan
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
          Meal Plans ({assignedMealPlans.length})
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplatePicker(true)} className="btn-secondary text-sm">
            <FileDown className="mr-1 h-4 w-4" />
            From Template
          </button>
          <button
            onClick={() => {
              setShowCustomForm(true);
              setCustomMeals(defaultMeals());
            }}
            className="btn-primary text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            Custom Plan
          </button>
        </div>
      </div>

      {/* Custom Plan Form */}
      {showCustomForm && (
        <div className="card mb-4 border-2 border-orange-200">
          <form onSubmit={handleCreateCustom}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">New Custom Meal Plan</h4>
              <button type="button" onClick={() => setShowCustomForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <input type="text" required value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Plan name" className="input" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div><label className="text-xs text-gray-500">Calories</label><input type="number" value={customCalories} onChange={(e) => setCustomCalories(e.target.value)} className="input mt-0.5" placeholder="1800" /></div>
              <div><label className="text-xs text-gray-500">Protein (g)</label><input type="number" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} className="input mt-0.5" placeholder="150" /></div>
              <div><label className="text-xs text-gray-500">Carbs (g)</label><input type="number" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} className="input mt-0.5" placeholder="180" /></div>
              <div><label className="text-xs text-gray-500">Fat (g)</label><input type="number" value={customFat} onChange={(e) => setCustomFat(e.target.value)} className="input mt-0.5" placeholder="60" /></div>
            </div>
            <div className="mt-3">
              {renderMealEditor(customMeals, setCustomMeals)}
            </div>
            <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? "Creating..." : "Create Meal Plan"}
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
                        <span>from: {plan.mealPlan.sourceTemplate.name}</span>
                      )}
                      {plan.mealPlan.targetCalories && <span>{plan.mealPlan.targetCalories} cal</span>}
                      <span>{meals.length} meals</span>
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      Remove
                    </button>
                  </div>

                  {plan.mealPlan.targetCalories && (
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                        {plan.mealPlan.targetCalories} cal
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
                            {food.calories && <span className="text-xs text-gray-400">{food.calories} cal</span>}
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
                    <label className="text-xs text-gray-500">Plan Name</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="input mt-0.5" />
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-3">
                    <div><label className="text-xs text-gray-500">Calories</label><input type="number" value={editCalories} onChange={(e) => setEditCalories(e.target.value)} className="input mt-0.5" /></div>
                    <div><label className="text-xs text-gray-500">Protein</label><input type="number" value={editProtein} onChange={(e) => setEditProtein(e.target.value)} className="input mt-0.5" /></div>
                    <div><label className="text-xs text-gray-500">Carbs</label><input type="number" value={editCarbs} onChange={(e) => setEditCarbs(e.target.value)} className="input mt-0.5" /></div>
                    <div><label className="text-xs text-gray-500">Fat</label><input type="number" value={editFat} onChange={(e) => setEditFat(e.target.value)} className="input mt-0.5" /></div>
                  </div>
                  {renderMealEditor(editMeals, setEditMeals)}
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => handleSaveEdit(plan.id)} disabled={saving} className="btn-primary text-sm">
                      <Check className="mr-1 h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditingPlanId(null)} className="btn-secondary text-sm">Cancel</button>
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
