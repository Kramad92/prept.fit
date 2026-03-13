"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Dumbbell, UtensilsCrossed, Calendar, ClipboardList, Copy, Check, X, Search } from "lucide-react";

interface TenantRef {
  id: string;
  name: string;
  slug: string;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  tenant: TenantRef;
  _count: { exercises: number; assignedTo: number; programDays: number };
}

interface MealPlanTemplate {
  id: string;
  name: string;
  description: string | null;
  targetCalories: number | null;
  createdAt: string;
  tenant: TenantRef;
  _count: { meals: number; assignedTo: number; programDays: number };
}

interface WorkoutProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  createdAt: string;
  tenant: TenantRef;
  _count: { days: number; assignments: number };
  days: { id: string; weekNumber: number; dayNumber: number; label: string | null; workoutPlan: { id: string; name: string } | null }[];
}

interface NutritionProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  mealsPerDay: number;
  createdAt: string;
  tenant: TenantRef;
  _count: { days: number; assignments: number };
  days: { id: string; weekNumber: number; dayNumber: number; label: string | null; mealPlan: { id: string; name: string } | null }[];
}

type TemplateType = "all" | "workout" | "meal" | "workout_program" | "nutrition_program";

const TYPE_OPTIONS: { value: TemplateType; label: string; icon: typeof Dumbbell }[] = [
  { value: "all", label: "All", icon: ClipboardList },
  { value: "workout", label: "Workouts", icon: Dumbbell },
  { value: "meal", label: "Meal Plans", icon: UtensilsCrossed },
  { value: "workout_program", label: "Workout Programs", icon: Calendar },
  { value: "nutrition_program", label: "Nutrition Programs", icon: UtensilsCrossed },
];

export default function TemplatesPage() {
  const [type, setType] = useState<TemplateType>("all");
  const [search, setSearch] = useState("");
  const [filterTenantId, setFilterTenantId] = useState("");
  const [workouts, setWorkouts] = useState<WorkoutTemplate[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanTemplate[]>([]);
  const [workoutPrograms, setWorkoutPrograms] = useState<WorkoutProgramTemplate[]>([]);
  const [nutritionPrograms, setNutritionPrograms] = useState<NutritionProgramTemplate[]>([]);
  const [tenants, setTenants] = useState<TenantRef[]>([]);
  const [loading, setLoading] = useState(true);

  // Copy modal state
  const [copyModal, setCopyModal] = useState<{ type: string; sourceId: string; name: string } | null>(null);
  const [copyTargetTenantId, setCopyTargetTenantId] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchTemplates = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (search) params.set("search", search);
    if (filterTenantId) params.set("tenantId", filterTenantId);

    fetch(`/api/admin/templates?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setWorkouts(data.workouts || []);
        setMealPlans(data.mealPlans || []);
        setWorkoutPrograms(data.workoutPrograms || []);
        setNutritionPrograms(data.nutritionPrograms || []);
        setTenants(data.tenants || []);
      })
      .finally(() => setLoading(false));
  }, [type, search, filterTenantId]);

  useEffect(() => {
    const timer = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(timer);
  }, [fetchTemplates]);

  async function handleCopy() {
    if (!copyModal || !copyTargetTenantId) return;
    setCopying(true);
    setCopyResult(null);
    try {
      const res = await fetch("/api/admin/templates/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: copyModal.type, sourceId: copyModal.sourceId, targetTenantId: copyTargetTenantId }),
      });
      const data = await res.json();
      if (res.ok) {
        const targetName = tenants.find((t) => t.id === copyTargetTenantId)?.name || "tenant";
        setCopyResult({ success: true, message: `Copied "${data.name}" to ${targetName}` });
        fetchTemplates();
      } else {
        setCopyResult({ success: false, message: data.error || "Copy failed" });
      }
    } catch {
      setCopyResult({ success: false, message: "Network error" });
    }
    setCopying(false);
  }

  const totalCount = workouts.length + mealPlans.length + workoutPrograms.length + nutritionPrograms.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
      <p className="mt-1 text-sm text-gray-500">Browse and copy workout plans, meal plans, and programs across coaches</p>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Type tabs */}
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setType(opt.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                type === opt.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <opt.icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Coach filter */}
        <select
          value={filterTenantId}
          onChange={(e) => setFilterTenantId(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">All coaches</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading && !totalCount ? (
        <div className="mt-12 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : totalCount === 0 ? (
        <p className="mt-12 text-center text-sm text-gray-400">No templates found</p>
      ) : (
        <div className="mt-6 space-y-8">
          {/* Workout Plans */}
          {workouts.length > 0 && (
            <Section title="Workout Plans" icon={Dumbbell} count={workouts.length}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Exercises</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workouts.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{w.name}</p>
                        {w.description && <p className="text-xs text-gray-400 line-clamp-1">{w.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/coaches/${w.tenant.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">{w.tenant.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{w._count.exercises}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{w._count.assignedTo}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setCopyModal({ type: "workout", sourceId: w.id, name: w.name }); setCopyTargetTenantId(""); setCopyResult(null); }}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Meal Plans */}
          {mealPlans.length > 0 && (
            <Section title="Meal Plans" icon={UtensilsCrossed} count={mealPlans.length}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Calories</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Meals</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mealPlans.map((mp) => (
                    <tr key={mp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{mp.name}</p>
                        {mp.description && <p className="text-xs text-gray-400 line-clamp-1">{mp.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/coaches/${mp.tenant.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">{mp.tenant.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{mp.targetCalories ? `${mp.targetCalories} kcal` : "-"}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{mp._count.meals}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{mp._count.assignedTo}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{new Date(mp.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setCopyModal({ type: "meal", sourceId: mp.id, name: mp.name }); setCopyTargetTenantId(""); setCopyResult(null); }}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Workout Programs */}
          {workoutPrograms.length > 0 && (
            <Section title="Workout Programs" icon={Calendar} count={workoutPrograms.length}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Duration</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Days/Week</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workoutPrograms.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/coaches/${p.tenant.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">{p.tenant.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p.durationWeeks}w</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p.daysPerWeek}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p._count.assignments}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setCopyModal({ type: "workout_program", sourceId: p.id, name: p.name }); setCopyTargetTenantId(""); setCopyResult(null); }}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Nutrition Programs */}
          {nutritionPrograms.length > 0 && (
            <Section title="Nutrition Programs" icon={UtensilsCrossed} count={nutritionPrograms.length}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Duration</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Meals/Day</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Assigned</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nutritionPrograms.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/coaches/${p.tenant.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">{p.tenant.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p.durationWeeks}w</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p.mealsPerDay}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{p._count.assignments}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => { setCopyModal({ type: "nutrition_program", sourceId: p.id, name: p.name }); setCopyTargetTenantId(""); setCopyResult(null); }}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </div>
      )}

      {/* Copy Modal */}
      {copyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !copying && setCopyModal(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Copy Template</h3>
              <button onClick={() => !copying && setCopyModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-sm text-gray-600">
              Copy <span className="font-medium text-gray-900">&quot;{copyModal.name}&quot;</span> to another coach.
              {(copyModal.type === "workout_program" || copyModal.type === "nutrition_program") && (
                <span className="mt-1 block text-xs text-amber-600">
                  All referenced {copyModal.type === "workout_program" ? "workout plans" : "meal plans"} will also be copied.
                </span>
              )}
            </p>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Target Coach</label>
              <select
                value={copyTargetTenantId}
                onChange={(e) => setCopyTargetTenantId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Select a coach...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} (/{t.slug})</option>
                ))}
              </select>
            </div>

            {copyResult && (
              <div className={`mt-3 rounded-lg p-3 text-sm ${copyResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {copyResult.success ? <Check className="mr-1 inline h-4 w-4" /> : <X className="mr-1 inline h-4 w-4" />}
                {copyResult.message}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setCopyModal(null)}
                disabled={copying}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {copyResult?.success ? "Close" : "Cancel"}
              </button>
              {!copyResult?.success && (
                <button
                  onClick={handleCopy}
                  disabled={copying || !copyTargetTenantId}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {copying ? "Copying..." : "Copy Template"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: typeof Dumbbell; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{count}</span>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {children}
      </div>
    </div>
  );
}
