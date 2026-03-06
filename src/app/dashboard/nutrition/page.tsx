"use client";

import { useState, useEffect } from "react";
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
import type { Food } from "@/types";
import { useToast } from "@/components/ui/toast";

interface MealPlanSummary {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  mealCount: number;
  assignedCount: number;
}

interface MealRow {
  name: string;
  time: string;
  foods: Food[];
}

interface ClientOption {
  id: string;
  name: string;
}

export default function NutritionPage() {
  const { toastSuccess, toastError } = useToast();
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

  // Edit state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Create/Edit form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCalories, setNewCalories] = useState("");
  const [newProtein, setNewProtein] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFat, setNewFat] = useState("");
  const [meals, setMeals] = useState<MealRow[]>([
    { name: "Breakfast", time: "07:30", foods: [] },
    { name: "Lunch", time: "12:30", foods: [] },
    { name: "Dinner", time: "19:00", foods: [] },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/meal-plans").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setPlans(p);
        setClients(c);
      })
      .catch(() => toastError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  async function loadPlanDetail(id: string) {
    if (expandedPlan === id) {
      setExpandedPlan(null);
      setPlanDetail(null);
      return;
    }
    const data = await fetch(`/api/meal-plans/${id}`).then((r) => r.json());
    setPlanDetail(data);
    setExpandedPlan(id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: newName,
      description: newDesc || null,
      targetCalories: newCalories || null,
      targetProtein: newProtein || null,
      targetCarbs: newCarbs || null,
      targetFat: newFat || null,
      meals: meals
        .filter((m) => m.name.trim())
        .map((m, i) => ({
          name: m.name,
          time: m.time || null,
          foods: m.foods.filter((f) => f.name.trim()),
          orderIndex: i,
        })),
    };

    const url = editingPlanId ? `/api/meal-plans/${editingPlanId}` : "/api/meal-plans";
    const method = editingPlanId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await fetch("/api/meal-plans").then((r) => r.json());
      setPlans(updated);
      setShowCreate(false);
      setEditingPlanId(null);
      resetForm();
    }
    setSaving(false);
  }

  async function handleDuplicate(planId: string) {
    setDuplicating(planId);
    const res = await fetch(`/api/meal-plans/${planId}/duplicate`, { method: "POST" });
    if (res.ok) {
      const updated = await fetch("/api/meal-plans").then((r) => r.json());
      setPlans(updated);
    }
    setDuplicating(null);
  }

  async function handleDelete(planId: string) {
    const res = await fetch(`/api/meal-plans/${planId}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (expandedPlan === planId) {
        setExpandedPlan(null);
        setPlanDetail(null);
      }
    }
  }

  async function handleEdit(planId: string) {
    const data = await fetch(`/api/meal-plans/${planId}`).then((r) => r.json());
    setEditingPlanId(planId);
    setNewName(data.name);
    setNewDesc(data.description || "");
    setNewCalories(data.targetCalories?.toString() || "");
    setNewProtein(data.targetProtein?.toString() || "");
    setNewCarbs(data.targetCarbs?.toString() || "");
    setNewFat(data.targetFat?.toString() || "");
    setMeals(
      data.meals.map((m: any) => ({
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
      }))
    );
    setShowCreate(true);
  }

  async function handleAssign() {
    if (!assignPlanId || !assignClientId) return;
    await fetch("/api/meal-plans/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealPlanId: assignPlanId, clientId: assignClientId }),
    });
    const updated = await fetch("/api/meal-plans").then((r) => r.json());
    setPlans(updated);
    setAssignPlanId(null);
    setAssignClientId("");
  }

  function resetForm() {
    setNewName("");
    setNewDesc("");
    setNewCalories("");
    setNewProtein("");
    setNewCarbs("");
    setNewFat("");
    setEditingPlanId(null);
    setMeals([
      { name: "Breakfast", time: "07:30", foods: [] },
      { name: "Lunch", time: "12:30", foods: [] },
      { name: "Dinner", time: "19:00", foods: [] },
    ]);
  }

  function updateFood(mealIndex: number, foodIndex: number, field: string, value: string) {
    setMeals((prev) =>
      prev.map((m, mi) =>
        mi === mealIndex
          ? {
              ...m,
              foods: m.foods.map((f, fi) =>
                fi === foodIndex
                  ? { ...f, [field]: ["calories", "protein", "carbs", "fat"].includes(field) ? (value ? parseInt(value) : null) : value }
                  : f
              ),
            }
          : m
      )
    );
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Meal Plan Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Reusable templates — assign to clients from their profile page
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Meal Plan
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search meal plans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={UtensilsCrossed}
            title="No meal plans yet"
            description="Create your first meal plan to assign to clients."
            action={
              <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Create Meal Plan
              </button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
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
                          Template
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {plan.targetCalories && <span>{plan.targetCalories} cal</span>}
                      <span>{plan.mealCount} meals</span>
                      <span>{plan.assignedCount} clients</span>
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(plan.id)}
                    disabled={duplicating === plan.id}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setAssignPlanId(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600"
                    title="Assign to client"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    title="Delete"
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
                      <p className="text-xs font-medium text-gray-500">Assigned to:</p>
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
              <h2 className="text-lg font-semibold">Assign Meal Plan</h2>
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
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!assignClientId}
                className="btn-primary mt-3 w-full"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50">
          <div className="flex min-h-full items-end justify-center md:items-center md:p-4">
            <div className="w-full max-w-2xl rounded-t-2xl bg-white p-6 md:rounded-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingPlanId ? "Edit Meal Plan" : "Create Meal Plan"}
                </h2>
                <button
                  onClick={() => { setShowCreate(false); resetForm(); }}
                  className="rounded-lg p-1 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Plan Name *</label>
                  <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="input mt-1" placeholder="Fat Loss - 1800 cal" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="input mt-1" placeholder="Low carb, high protein plan" />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Calories</label>
                    <input type="number" value={newCalories} onChange={(e) => setNewCalories(e.target.value)} className="input mt-1" placeholder="1800" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Protein (g)</label>
                    <input type="number" value={newProtein} onChange={(e) => setNewProtein(e.target.value)} className="input mt-1" placeholder="150" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Carbs (g)</label>
                    <input type="number" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value)} className="input mt-1" placeholder="180" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Fat (g)</label>
                    <input type="number" value={newFat} onChange={(e) => setNewFat(e.target.value)} className="input mt-1" placeholder="60" />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Meals</h3>
                    <button
                      type="button"
                      onClick={() => setMeals((prev) => [...prev, { name: "", time: "", foods: [] }])}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      + Add Meal
                    </button>
                  </div>

                  {meals.map((meal, mi) => (
                    <div key={mi} className="mt-3 rounded-lg border border-gray-200 p-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={meal.name}
                            onChange={(e) => setMeals((prev) => prev.map((m, i) => i === mi ? { ...m, name: e.target.value } : m))}
                            className="input"
                            placeholder="Meal name (e.g., Breakfast)"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="time"
                            value={meal.time}
                            onChange={(e) => setMeals((prev) => prev.map((m, i) => i === mi ? { ...m, time: e.target.value } : m))}
                            className="input"
                          />
                        </div>
                        {meals.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setMeals((prev) => prev.filter((_, i) => i !== mi))}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="mt-2 space-y-2">
                        {meal.foods.map((food, fi) => (
                          <div key={fi} className="grid grid-cols-6 gap-2">
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={food.name}
                                onChange={(e) => updateFood(mi, fi, "name", e.target.value)}
                                className="input text-xs"
                                placeholder="Food item"
                              />
                            </div>
                            <input type="text" value={food.portion} onChange={(e) => updateFood(mi, fi, "portion", e.target.value)} className="input text-xs" placeholder="Portion" />
                            <input type="number" value={food.calories ?? ""} onChange={(e) => updateFood(mi, fi, "calories", e.target.value)} className="input text-xs" placeholder="Cal" />
                            <input type="number" value={food.protein ?? ""} onChange={(e) => updateFood(mi, fi, "protein", e.target.value)} className="input text-xs" placeholder="P (g)" />
                            <div className="flex gap-1">
                              <input type="number" value={food.fat ?? ""} onChange={(e) => updateFood(mi, fi, "fat", e.target.value)} className="input text-xs" placeholder="F (g)" />
                              <button type="button" onClick={() => {
                                setMeals((prev) => prev.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                              }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        ))}
                        {/* Add food — typing triggers search */}
                        <FoodPicker
                          variant="inline"
                          inputClassName="input text-xs"
                          placeholder="+ Add food item..."
                          onSelect={(food) => {
                            setMeals((prev) =>
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
                </div>

                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? "Saving..." : editingPlanId ? "Save Changes" : "Create Meal Plan"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
