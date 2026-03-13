"use client";

import { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  CalendarRange,
  Plus,
  ChevronDown,
  ChevronUp,
  X,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { FoodPicker } from "@/components/client/food-picker";
import { format } from "date-fns";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Food, NutritionLog } from "@/types";

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
    meals: Array<{
      id: string;
      name: string;
      description: string | null;
      time: string | null;
      foods: Food[];
      orderIndex: number;
    }>;
  };
  clientMeals: Array<{
    id: string;
    name: string;
    description: string | null;
    time: string | null;
    foods: Food[];
    orderIndex: number;
    notes: string | null;
  }>;
}

interface NutritionProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  mealPlan: { id: string; name: string; description: string | null } | null;
}

interface AssignedNutritionProgram {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  program: {
    id: string;
    name: string;
    description: string | null;
    durationWeeks: number;
    mealsPerDay: number;
    days: NutritionProgramDay[];
  };
  clientMealPlans: AssignedPlan[];
}

export default function PortalNutritionPage() {
  const t = useT();
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [nutritionPrograms, setNutritionPrograms] = useState<AssignedNutritionProgram[]>([]);
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"plans" | "log">("plans");
  const [mealName, setMealName] = useState("Breakfast");
  const [logFoods, setLogFoods] = useState<{ name: string; portion?: string; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null }[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<any>("/api/portal/me"),
      api.get<NutritionLog[]>("/api/nutrition-logs?days=14"),
    ])
      .then(([data, logData]) => {
        // Standalone plans (not part of a nutrition program)
        const standalone = (data.assignedMealPlans || []).filter(
          (p: AssignedPlan & { clientNutritionProgramId?: string | null }) => !p.clientNutritionProgramId
        );
        setPlans(standalone);
        setNutritionPrograms(data.assignedNutritionPrograms || []);
        setLogs(logData);
        if (data.assignedNutritionPrograms?.length > 0) {
          setExpandedProgram(data.assignedNutritionPrograms[0].id);
        } else if (standalone.length > 0) {
          setExpanded(standalone[0].id);
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
      mealName,
      foods: allFoods,
      calories: (fd.get("calories") ? Number(fd.get("calories")) : 0) + totalCal || null,
      protein: (fd.get("protein") ? Number(fd.get("protein")) : 0) + totalP || null,
      carbs: (fd.get("carbs") ? Number(fd.get("carbs")) : 0) + totalC || null,
      fat: (fd.get("fat") ? Number(fd.get("fat")) : 0) + totalF || null,
      notes: fd.get("notes") || null,
    };

    try {
      await api.post("/api/nutrition-logs", data);
      setSaved(true);
      setShowLog(false);
      setMealName("Breakfast");
      setLogFoods([]);
      const updated = await api.get<NutritionLog[]>("/api/nutrition-logs?days=14");
      setLogs(updated);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // handled by api client
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
        <Button onClick={() => setShowLog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t.portalNutrition.logMeal}
        </Button>
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
            {plans.length === 0 && nutritionPrograms.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title={t.portalNutrition.noMealPlans}
                description={t.portalNutrition.noMealPlansDesc}
              />
            ) : (
              <div className="space-y-4">
                {/* Nutrition Programs */}
                {nutritionPrograms.map((prog) => {
                  const isOpen = expandedProgram === prog.id;
                  const weekGroups: Record<number, NutritionProgramDay[]> = {};
                  for (const d of prog.program.days) {
                    if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
                    weekGroups[d.weekNumber].push(d);
                  }
                  const now = new Date();
                  const startDate = new Date(prog.startDate);
                  const currentWeekNum = Math.max(
                    1,
                    Math.ceil(
                      (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
                    )
                  );

                  return (
                    <div key={prog.id} className="card">
                      <button
                        onClick={() =>
                          setExpandedProgram(isOpen ? null : prog.id)
                        }
                        className="flex w-full items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                            <CalendarRange className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">
                              {prog.program.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {prog.program.durationWeeks} {t.programs.weeks} &middot;{" "}
                              {prog.clientMealPlans.length} {t.programs.mealPlansCount} &middot;{" "}
                              {t.programs.week} {Math.min(currentWeekNum, prog.program.durationWeeks)}
                            </p>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                          {prog.program.description && (
                            <p className="text-sm text-gray-500">{prog.program.description}</p>
                          )}
                          {Object.entries(weekGroups).map(([weekStr, weekDays]) => {
                            const week = Number(weekStr);
                            const isCurrent = week === Math.min(currentWeekNum, prog.program.durationWeeks);
                            return (
                              <div key={weekStr}>
                                <h4
                                  className={`text-sm font-semibold ${isCurrent ? "text-brand-700" : "text-gray-600"}`}
                                >
                                  {t.programs.week} {week}
                                  {isCurrent && " (current)"}
                                </h4>
                                <div className="mt-1 space-y-1">
                                  {weekDays.map((day) => (
                                    <div
                                      key={day.id}
                                      className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                                    >
                                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700">
                                        {day.dayNumber}
                                      </span>
                                      <span className="flex-1 text-sm text-gray-700">
                                        {day.label || day.mealPlan?.name || t.programs.restDay}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Standalone label */}
                {plans.length > 0 && nutritionPrograms.length > 0 && (
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t.portalNutrition.mealPlans}
                  </h2>
                )}

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
                              {meal.description && (
                                <p className="mt-0.5 text-xs text-gray-500 italic">{meal.description}</p>
                              )}
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
                  <Button onClick={() => setShowLog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t.portalNutrition.logMeal}
                  </Button>
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
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t.portalNutrition.logMeal}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLogMeal} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.portalNutrition.meal} *
                </label>
                <FilterSelect
                  value={mealName}
                  onChange={setMealName}
                  placeholder={t.portalNutrition.meal}
                  className="mt-1"
                  options={[
                    { value: "Breakfast", label: t.nutrition.breakfast },
                    { value: "Snack", label: t.portalNutrition.morningSnack },
                    { value: "Lunch", label: t.nutrition.lunch },
                    { value: "Afternoon Snack", label: t.portalNutrition.afternoonSnack },
                    { value: "Dinner", label: t.nutrition.dinner },
                    { value: "Evening Snack", label: t.portalNutrition.eveningSnack },
                  ]}
                />
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
                <Textarea
                  name="foods"
                  rows={2}
                  className="mt-1"
                  placeholder={t.portalNutrition.additionalFoodsPlaceholder}
                />
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.portalNutrition.cal}
                  </label>
                  <Input
                    type="number"
                    name="calories"
                    className="mt-1"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.protein}
                  </label>
                  <Input
                    type="number"
                    name="protein"
                    className="mt-1"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.carbs}
                  </label>
                  <Input
                    type="number"
                    name="carbs"
                    className="mt-1"
                    placeholder="40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    {t.nutrition.fat}
                  </label>
                  <Input
                    type="number"
                    name="fat"
                    className="mt-1"
                    placeholder="20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.common.notes}
                </label>
                <Input
                  type="text"
                  name="notes"
                  className="mt-1"
                  placeholder={t.portalNutrition.notesPlaceholder}
                />
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? t.common.saving : t.portalNutrition.logMeal}
              </Button>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
