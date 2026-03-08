"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, UtensilsCrossed, Search, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { NutritionPlanCard } from "@/components/nutrition/nutrition-plan-card";
import { NutritionPlanForm, type FormState, type MealRow } from "@/components/nutrition/nutrition-plan-form";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { computeFoodTotals } from "@/lib/portion-scaling";
import type { Food, MealPlanSummary, ClientOption } from "@/types";

const DEFAULT_MEALS: MealRow[] = [
  { name: "", description: "", time: "07:30", foods: [] },
  { name: "", description: "", time: "12:30", foods: [] },
  { name: "", description: "", time: "19:00", foods: [] },
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
  return (
    <Suspense>
      <NutritionContent />
    </Suspense>
  );
}

function NutritionContent() {
  const t = useT();
  const { toastError } = useToast();
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

  useEffect(() => {
    Promise.all([
      api.get<MealPlanSummary[]>("/api/meal-plans"),
      api.get<ClientOption[]>("/api/clients"),
    ])
      .then(([p, c]) => { setPlans(p); setClients(c); })
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
          description: m.description || null,
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
        description: m.description || "",
        time: m.time || "",
        foods: (m.foods as Food[])?.length > 0
          ? (m.foods as Food[]).map((f: Food) => ({
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

  const totals = useMemo(() => computeFoodTotals(form.meals), [form.meals]);

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
          <p className="mt-1 text-sm text-gray-500">{t.nutrition.mealPlanTemplatesDesc}</p>
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
            <NutritionPlanCard
              key={plan.id}
              plan={plan}
              isExpanded={expandedPlan === plan.id}
              planDetail={expandedPlan === plan.id ? planDetail : null}
              duplicating={duplicating === plan.id}
              onToggleExpand={loadPlanDetail}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onAssign={setAssignPlanId}
              onDelete={handleDelete}
            />
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
        <NutritionPlanForm
          form={form}
          editingPlanId={editingPlanId}
          saving={saving}
          onFormChange={(updater) => setForm(updater)}
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setForm(emptyForm()); setEditingPlanId(null); }}
        />
      )}
    </div>
  );
}
