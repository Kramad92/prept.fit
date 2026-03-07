"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  UtensilsCrossed,
  Search,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  UserPlus,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FoodPicker } from "@/components/client/food-picker";
import { AIGenerateMealPlan } from "@/components/ai/ai-generate-meal-plan";
import { AIFillMacros } from "@/components/ai/ai-fill-macros";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { scalePortionFood, computeFoodTotals } from "@/lib/portion-scaling";
import type { Food, MealPlanSummary, ClientOption } from "@/types";

interface MealRow {
  name: string;
  time: string;
  foods: Food[];
}

interface FormState {
  name: string;
  description: string;
  targetCalories: string;
  targetProtein: string;
  targetCarbs: string;
  targetFat: string;
  meals: MealRow[];
}

const DEFAULT_MEALS: MealRow[] = [
  { name: "Breakfast", time: "07:30", foods: [] },
  { name: "Lunch", time: "12:30", foods: [] },
  { name: "Dinner", time: "19:00", foods: [] },
];

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    targetCalories: "",
    targetProtein: "",
    targetCarbs: "",
    targetFat: "",
    meals: DEFAULT_MEALS.map((m) => ({ ...m, foods: [] })),
  };
}

export default function NutritionPage() {
  const t = useT();
  const { toastSuccess, toastError } = useToast();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<MealPlanSummary[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [assignPlanId, setAssignPlanId] = useState<string | null>(null);
  const [assignClientId, setAssignClientId] = useState("");
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planDetail, setPlanDetail] = useState<any>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  function updateMeals(updater: (meals: MealRow[]) => MealRow[]) {
    setForm((prev) => ({ ...prev, meals: updater(prev.meals) }));
  }

  useEffect(() => {
    Promise.all([
      api.get<MealPlanSummary[]>("/api/meal-plans"),
      api.get<ClientOption[]>("/api/clients"),
    ])
      .then(([p, c]) => {
        setPlans(p);
        setClients(c);
      })
      .catch(() => toastError(t.errors.failedToLoad))
      .finally(() => setLoading(false));
  }, []);

  // Auto-expand plan from query param (e.g. from global search)
  useEffect(() => {
    const planId = searchParams.get("plan");
    if (planId && !loading && plans.some((p) => p.id === planId) && expandedPlan !== planId) {
      api.get(`/api/meal-plans/${planId}`).then((data) => {
        setPlanDetail(data);
        setExpandedPlan(planId);
      });
    }
  }, [searchParams, loading, plans]);

  async function loadPlanDetail(id: string) {
    if (expandedPlan === id) {
      setExpandedPlan(null);
      setPlanDetail(null);
      return;
    }
    const data = await api.get(`/api/meal-plans/${id}`);
    setPlanDetail(data);
    setExpandedPlan(id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: form.name,
      description: form.description || null,
      targetCalories: form.targetCalories ? parseInt(form.targetCalories) : null,
      targetProtein: form.targetProtein ? parseInt(form.targetProtein) : null,
      targetCarbs: form.targetCarbs ? parseInt(form.targetCarbs) : null,
      targetFat: form.targetFat ? parseInt(form.targetFat) : null,
      meals: form.meals
        .filter((m) => m.name.trim())
        .map((m, i) => ({
          name: m.name,
          time: m.time || null,
          foods: m.foods.filter((f) => f.name.trim()),
          orderIndex: i,
        })),
    };

    try {
      if (editingPlanId) {
        await api.put(`/api/meal-plans/${editingPlanId}`, body);
      } else {
        await api.post("/api/meal-plans", body);
      }
      const updated = await api.get<MealPlanSummary[]>("/api/meal-plans");
      setPlans(updated);
      setShowCreate(false);
      setEditingPlanId(null);
      setForm(emptyForm());
    } catch {
      toastError(t.errors.somethingWentWrong);
    }
    setSaving(false);
  }

  async function handleDuplicate(planId: string) {
    setDuplicating(planId);
    try {
      await api.post(`/api/meal-plans/${planId}/duplicate`);
      const updated = await api.get<MealPlanSummary[]>("/api/meal-plans");
      setPlans(updated);
    } catch {
      toastError(t.errors.somethingWentWrong);
    }
    setDuplicating(null);
  }

  async function handleDelete(planId: string) {
    try {
      await api.delete(`/api/meal-plans/${planId}`);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (expandedPlan === planId) {
        setExpandedPlan(null);
        setPlanDetail(null);
      }
    } catch {
      toastError(t.errors.somethingWentWrong);
    }
  }

  async function handleEdit(planId: string) {
    const data = await api.get<any>(`/api/meal-plans/${planId}`);
    setEditingPlanId(planId);
    setForm({
      name: data.name,
      description: data.description || "",
      targetCalories: data.targetCalories?.toString() || "",
      targetProtein: data.targetProtein?.toString() || "",
      targetCarbs: data.targetCarbs?.toString() || "",
      targetFat: data.targetFat?.toString() || "",
      meals: data.meals.map((m: any) => ({
        name: m.name,
        time: m.time || "",
        foods: (m.foods as Food[])?.length > 0
          ? (m.foods as Food[]).map((f: any) => ({
              name: f.name || "",
              portion: f.portion || "",
              calories: f.calories ?? null,
              protein: f.protein ?? null,
              carbs: f.carbs ?? null,
              fat: f.fat ?? null,
            }))
          : [],
      })),
    });
    setShowCreate(true);
  }

  async function handleAssign() {
    if (!assignPlanId || !assignClientId) return;
    try {
      await api.post("/api/meal-plans/assign", {
        mealPlanId: assignPlanId,
        clientId: assignClientId,
      });
      const updated = await api.get<MealPlanSummary[]>("/api/meal-plans");
      setPlans(updated);
    } catch {
      toastError(t.errors.somethingWentWrong);
    }
    setAssignPlanId(null);
    setAssignClientId("");
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

  const totals = useMemo(() => computeFoodTotals(form.meals), [form.meals]);

  // Auto-fill macro fields from food totals
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      targetCalories: totals.calories ? totals.calories.toString() : "",
      targetProtein: totals.protein ? totals.protein.toString() : "",
      targetCarbs: totals.carbs ? totals.carbs.toString() : "",
      targetFat: totals.fat ? totals.fat.toString() : "",
    }));
  }, [totals]);

  const filtered = plans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.nutrition.mealPlanTemplates}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.nutrition.mealPlanTemplatesDesc}
          </p>
        </div>
        <button onClick={() => { setForm(emptyForm()); setEditingPlanId(null); setShowCreate(true); }} className="btn-primary">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t.nutrition.newMealPlan}</span>
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t.nutrition.searchMealPlans}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={UtensilsCrossed}
            title={t.nutrition.noMealPlans}
            description={t.nutrition.noMealPlansDesc}
            action={
              <button onClick={() => { setForm(emptyForm()); setEditingPlanId(null); setShowCreate(true); }} className="btn-primary">
                <Plus className="mr-1 h-4 w-4" />
                {t.nutrition.createPlan}
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4 stagger-in">
          {filtered.map((plan) => (
            <div key={plan.id} className="card">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => loadPlanDetail(plan.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                    <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                      {plan.isTemplate && (
                        <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {t.nutrition.template}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {plan.targetCalories && <span>{plan.targetCalories} cal</span>}
                      <span>{plan.mealCount} {t.nutrition.meals_count}</span>
                      <span>{plan.assignedCount} {t.workouts.clients_count}</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title={t.common.edit}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(plan.id)}
                    disabled={duplicating === plan.id}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title={t.workouts.duplicate}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAssignPlanId(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600"
                    title={t.workouts.assignToClient}
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title={t.common.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  {expandedPlan === plan.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedPlan === plan.id && planDetail && (
                <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  {plan.targetCalories && (
                    <div className="flex gap-4 text-sm">
                      <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-700">
                        {plan.targetCalories} cal
                      </span>
                      {plan.targetProtein && (
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                          P: {plan.targetProtein}g
                        </span>
                      )}
                      {plan.targetCarbs && (
                        <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                          C: {plan.targetCarbs}g
                        </span>
                      )}
                      {plan.targetFat && (
                        <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">
                          F: {plan.targetFat}g
                        </span>
                      )}
                    </div>
                  )}
                  {planDetail.meals?.map((meal: any) => (
                    <div key={meal.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{meal.name}</p>
                        {meal.time && (
                          <span className="text-xs text-gray-400">{meal.time}</span>
                        )}
                      </div>
                      {(meal.foods as Food[])?.map((food: any, fi: number) => (
                        <div key={fi} className="mt-1 flex justify-between text-sm text-gray-600">
                          <span>
                            {food.name}
                            {food.portion && ` — ${food.portion}`}
                          </span>
                          {food.calories && (
                            <span className="text-xs text-gray-400">
                              {food.calories} cal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  {planDetail.assignedTo?.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-medium text-gray-500">{t.nutrition.assignedTo}</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {planDetail.assignedTo.map((a: any) => (
                          <span key={a.id} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                            {a.client.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assignPlanId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.nutrition.assignMealPlan}</h2>
              <button onClick={() => setAssignPlanId(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <select
                value={assignClientId}
                onChange={(e) => setAssignClientId(e.target.value)}
                className="input"
              >
                <option value="">{t.nutrition.selectClient}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!assignClientId}
                className="btn-primary mt-3 w-full"
              >
                {t.workouts.assign}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4">
          <div className="w-full max-w-2xl bg-white p-4 md:p-6 rounded-t-2xl md:rounded-2xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingPlanId ? t.nutrition.editMealPlan : t.nutrition.createMealPlan}
                </h2>
                <button
                  onClick={() => { setShowCreate(false); setForm(emptyForm()); setEditingPlanId(null); }}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.nutrition.planName} *</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="input mt-1" placeholder={t.nutrition.planNamePlaceholder} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.common.description}</label>
                  <input type="text" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="input mt-1" placeholder={t.nutrition.aiPromptPlaceholder} />
                  <div className="mt-1.5">
                    <AIGenerateMealPlan
                      prompt={form.description}
                      onGenerate={(data) => {
                        setForm({
                          name: data.name || form.name,
                          description: form.description,
                          targetCalories: data.targetCalories,
                          targetProtein: data.targetProtein,
                          targetCarbs: data.targetCarbs,
                          targetFat: data.targetFat,
                          meals: data.meals,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">{t.nutrition.calories}</label>
                    <input type="number" value={form.targetCalories} onChange={(e) => setForm((prev) => ({ ...prev, targetCalories: e.target.value }))} className="input mt-1" placeholder="1800" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">{t.nutrition.proteinG}</label>
                    <input type="number" value={form.targetProtein} onChange={(e) => setForm((prev) => ({ ...prev, targetProtein: e.target.value }))} className="input mt-1" placeholder="150" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">{t.nutrition.carbsG}</label>
                    <input type="number" value={form.targetCarbs} onChange={(e) => setForm((prev) => ({ ...prev, targetCarbs: e.target.value }))} className="input mt-1" placeholder="180" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">{t.nutrition.fatG}</label>
                    <input type="number" value={form.targetFat} onChange={(e) => setForm((prev) => ({ ...prev, targetFat: e.target.value }))} className="input mt-1" placeholder="60" />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-700">{t.nutrition.meals}</h3>
                      <AIFillMacros
                        meals={form.meals}
                        onFilled={(updatedMeals) => setForm((prev) => ({ ...prev, meals: updatedMeals }))}
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
                        {/* Add food — typing triggers search */}
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
      )}
    </div>
  );
}
