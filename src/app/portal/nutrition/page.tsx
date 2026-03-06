"use client";

import { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FoodPicker } from "@/components/client/food-picker";
import { format } from "date-fns";
import { useT } from "@/lib/i18n";
import type { Food, Meal, ClientMeal } from "@/types";

interface AssignedPlan {
  id: string;
  customName: string | null;
  isActive: boolean;
  mealPlan: {
    id: string;
    name: string;
    description: string | null;
    targetCalories: number | null;
    targetProtein: number | null;
    targetCarbs: number | null;
    targetFat: number | null;
    meals: Meal[];
  };
  clientMeals: ClientMeal[];
}

interface NutritionLog {
  id: string;
  date: string;
  mealName: string;
  foods: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
}

export default function PortalNutritionPage() {
  const t = useT();
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"plans" | "log">("plans");
  const [logFoods, setLogFoods] = useState<{ name: string; portion?: string; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/me").then((r) => r.json()),
      fetch("/api/nutrition-logs?days=14").then((r) => r.json()),
    ])
      .then(([data, logData]) => {
        setPlans(data.assignedMealPlans || []);
        setLogs(logData);
        if (data.assignedMealPlans?.length > 0) {
          setExpanded(data.assignedMealPlans[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLogMeal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const foodNames = logFoods.map((f) => f.portion ? `${f.name} (${f.portion})` : f.name).join(", ");
    const manualFoods = (fd.get("foods") as string) || "";
    const allFoods = [foodNames, manualFoods].filter(Boolean).join(", ");
    const totalCal = logFoods.reduce((s, f) => s + (f.calories || 0), 0);
    const totalP = logFoods.reduce((s, f) => s + (f.protein || 0), 0);
    const totalC = logFoods.reduce((s, f) => s + (f.carbs || 0), 0);
    const totalF = logFoods.reduce((s, f) => s + (f.fat || 0), 0);
    const data = {
      mealName: fd.get("mealName"),
      foods: allFoods,
      calories: (fd.get("calories") ? Number(fd.get("calories")) : 0) + totalCal || null,
      protein: (fd.get("protein") ? Number(fd.get("protein")) : 0) + totalP || null,
      carbs: (fd.get("carbs") ? Number(fd.get("carbs")) : 0) + totalC || null,
      fat: (fd.get("fat") ? Number(fd.get("fat")) : 0) + totalF || null,
      notes: fd.get("notes") || null,
    };

    const res = await fetch("/api/nutrition-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setSaved(true);
      setShowLog(false);
      setLogFoods([]);
      const updated = await fetch("/api/nutrition-logs?days=14").then((r) =>
        r.json()
      );
      setLogs(updated);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  // Group logs by date
  const logsByDate: Record<string, NutritionLog[]> = {};
  for (const log of logs) {
    const dateStr = format(new Date(log.date), "yyyy-MM-dd");
    if (!logsByDate[dateStr]) logsByDate[dateStr] = [];
    logsByDate[dateStr].push(log);
  }

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
          <h1 className="text-2xl font-bold text-gray-900">{t.portalNutrition.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.portalNutrition.mealPlansAndLog}
          </p>
        </div>
        <button onClick={() => setShowLog(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          {t.portalNutrition.logMeal}
        </button>
      </div>

      {saved && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4" />
          {t.portalNutrition.mealLogged}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("plans")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "plans"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.portalNutrition.mealPlans}
        </button>
        <button
          onClick={() => setTab("log")}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "log"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.portalNutrition.foodLog}
        </button>
      </div>

      <div className="mt-6">
        {tab === "plans" && (
          <>
            {plans.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={t.portalNutrition.noMealPlans}
                description={t.portalNutrition.noMealPlansDesc}
              />
            ) : (
              <div className="space-y-4">
                {plans.map((plan) => {
                  const isOpen = expanded === plan.id;
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
                            <h3 className="font-semibold text-gray-900">
                              {plan.customName || plan.mealPlan.name}
                            </h3>
                            {plan.mealPlan.targetCalories && (
                              <p className="text-xs text-gray-500">
                                {plan.mealPlan.targetCalories} {t.portalNutrition.calTarget}
                              </p>
                            )}
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                          {plan.mealPlan.targetCalories && (
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                                {plan.mealPlan.targetCalories} cal
                              </span>
                              {plan.mealPlan.targetProtein && (
                                <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                                  {t.nutrition.protein}: {plan.mealPlan.targetProtein}g
                                </span>
                              )}
                              {plan.mealPlan.targetCarbs && (
                                <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                                  {t.nutrition.carbs}: {plan.mealPlan.targetCarbs}g
                                </span>
                              )}
                              {plan.mealPlan.targetFat && (
                                <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">
                                  {t.nutrition.fat}: {plan.mealPlan.targetFat}g
                                </span>
                              )}
                            </div>
                          )}

                          {(plan.clientMeals?.length > 0 ? plan.clientMeals : plan.mealPlan.meals).map((meal) => (
                            <div
                              key={meal.id}
                              className="rounded-lg bg-gray-50 p-3"
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900">
                                  {meal.name}
                                </p>
                                {meal.time && (
                                  <span className="text-xs text-gray-400">
                                    {meal.time}
                                  </span>
                                )}
                              </div>
                              {(meal.foods as Food[]).map((food, fi) => (
                                <div
                                  key={fi}
                                  className="mt-1 flex justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {food.name}
                                    {food.portion && (
                                      <span className="text-gray-400">
                                        {" "}
                                        — {food.portion}
                                      </span>
                                    )}
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
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "log" && (
          <>
            {Object.keys(logsByDate).length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={t.portalNutrition.noMealsLogged}
                description={t.portalNutrition.startLogging}
                action={
                  <button onClick={() => setShowLog(true)} className="btn-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    {t.portalNutrition.logMeal}
                  </button>
                }
              />
            ) : (
              <div className="space-y-6">
                {Object.entries(logsByDate).map(([date, dayLogs]) => {
                  const totalCal = dayLogs.reduce(
                    (sum, l) => sum + (l.calories || 0),
                    0
                  );
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">
                          {format(
                            new Date(date + "T12:00:00"),
                            "EEEE, MMM d"
                          )}
                        </h3>
                        {totalCal > 0 && (
                          <span className="text-xs text-gray-400">
                            {totalCal} {t.portalNutrition.calTotal}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-2">
                        {dayLogs.map((log) => (
                          <div key={log.id} className="card py-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900">
                                {log.mealName}
                              </p>
                              {log.calories && (
                                <span className="text-sm text-gray-500">
                                  {log.calories} cal
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {log.foods}
                            </p>
                            <div className="mt-1 flex gap-3 text-xs text-gray-400">
                              {log.protein && <span>P: {log.protein}g</span>}
                              {log.carbs && <span>C: {log.carbs}g</span>}
                              {log.fat && <span>F: {log.fat}g</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Log Meal Modal */}
      {showLog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.portalNutrition.logMeal}</h2>
              <button
                onClick={() => setShowLog(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLogMeal} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.portalNutrition.meal} *
                </label>
                <select name="mealName" required className="input mt-1">
                  <option value="Breakfast">{t.nutrition.breakfast}</option>
                  <option value="Snack">{t.portalNutrition.morningSnack}</option>
                  <option value="Lunch">{t.nutrition.lunch}</option>
                  <option value="Afternoon Snack">{t.portalNutrition.afternoonSnack}</option>
                  <option value="Dinner">{t.nutrition.dinner}</option>
                  <option value="Evening Snack">{t.portalNutrition.eveningSnack}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.portalNutrition.searchFoods}
                </label>
                <div className="mt-1">
                  <FoodPicker
                    onSelect={(food) => setLogFoods((prev) => [...prev, food])}
                  />
                </div>
                {logFoods.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {logFoods.map((food, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
                      >
                        {food.name}
                        {food.calories != null && (
                          <span className="text-brand-400">{food.calories}cal</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setLogFoods((prev) => prev.filter((_, idx) => idx !== i))}
                          className="ml-0.5 text-brand-400 hover:text-brand-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.portalNutrition.additionalFoods}
                </label>
                <textarea
                  name="foods"
                  rows={2}
                  className="input mt-1"
                  placeholder={t.portalNutrition.additionalFoodsPlaceholder}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.portalNutrition.cal}
                  </label>
                  <input
                    type="number"
                    name="calories"
                    className="input mt-1"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.protein}
                  </label>
                  <input
                    type="number"
                    name="protein"
                    className="input mt-1"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.carbs}
                  </label>
                  <input
                    type="number"
                    name="carbs"
                    className="input mt-1"
                    placeholder="40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.fat}
                  </label>
                  <input
                    type="number"
                    name="fat"
                    className="input mt-1"
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.common.notes}
                </label>
                <input
                  type="text"
                  name="notes"
                  className="input mt-1"
                  placeholder={t.portalNutrition.notesPlaceholder}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full"
              >
                {saving ? t.common.saving : t.portalNutrition.logMeal}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
