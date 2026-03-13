"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

interface MealPlanOption {
  id: string;
  name: string;
  description: string | null;
  mealCount: number;
}

interface ProgramDay {
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  mealPlanId: string | null;
  mealPlan: { id: string; name: string } | null;
}

interface ProgramDetail {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  mealsPerDay: number;
  days: ProgramDay[];
}

interface DaySlot {
  weekNumber: number;
  dayNumber: number;
  label: string;
  mealPlanId: string | null;
}

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export default function EditNutritionProgramPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [days, setDays] = useState<DaySlot[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProgramDetail>(`/api/nutrition-programs/${params.id}`),
      api.get<MealPlanOption[]>("/api/nutrition"),
    ])
      .then(([prog, m]) => {
        setName(prog.name);
        setDescription(prog.description || "");
        setDurationWeeks(prog.durationWeeks);
        setMealsPerDay(prog.mealsPerDay);
        setMealPlans(m);

        const slots: DaySlot[] = [];
        for (let wk = 1; wk <= prog.durationWeeks; wk++) {
          for (let d = 1; d <= 7; d++) {
            const existing = prog.days.find(
              (pd) => pd.weekNumber === wk && pd.dayNumber === d
            );
            slots.push({
              weekNumber: wk,
              dayNumber: d,
              label: existing?.label || "",
              mealPlanId: existing?.mealPlanId || null,
            });
          }
        }
        setDays(slots);
      })
      .catch(() => router.push("/dashboard/programs"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Regenerate grid when weeks change
  useEffect(() => {
    if (loading) return;
    setDays((prev) => {
      const newDays: DaySlot[] = [];
      for (let w = 1; w <= durationWeeks; w++) {
        for (let d = 1; d <= 7; d++) {
          const existing = prev.find(
            (s) => s.weekNumber === w && s.dayNumber === d
          );
          newDays.push(
            existing || {
              weekNumber: w,
              dayNumber: d,
              label: "",
              mealPlanId: null,
            }
          );
        }
      }
      return newDays;
    });
  }, [durationWeeks, loading]);

  function updateDay(week: number, day: number, mealPlanId: string | null) {
    setDays((prev) =>
      prev.map((s) =>
        s.weekNumber === week && s.dayNumber === day
          ? { ...s, mealPlanId }
          : s
      )
    );
  }

  function updateLabel(week: number, day: number, label: string) {
    setDays((prev) =>
      prev.map((s) =>
        s.weekNumber === week && s.dayNumber === day ? { ...s, label } : s
      )
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/api/nutrition-programs/${params.id}`, {
        name,
        description: description || null,
        durationWeeks,
        mealsPerDay,
        days: days
          .filter((d) => d.mealPlanId)
          .map((d) => ({
            weekNumber: d.weekNumber,
            dayNumber: d.dayNumber,
            label: d.label || null,
            mealPlanId: d.mealPlanId,
          })),
      });
      router.push(`/dashboard/programs/nutrition/${params.id}`);
    } catch {
      // handled by api client
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const weekGroups: Record<number, DaySlot[]> = {};
  for (const d of days) {
    if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
    weekGroups[d.weekNumber].push(d);
  }

  const dayOptions = DAY_KEYS.map((key) => ({
    value: t.programs[key],
    label: t.programs[key],
  }));

  return (
    <div>
      <Link
        href={`/dashboard/programs/nutrition/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.programs.backToProgram}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        {t.programs.editNutritionProgram}
      </h1>

      <div className="mt-6 space-y-6">
        <div className="card space-y-4">
          <div>
            <label className="label">{t.programs.nutritionProgramName}</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t.common.description}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t.programs.durationWeeks}</label>
              <FilterSelect
                value={String(durationWeeks)}
                onChange={(v) => setDurationWeeks(Number(v))}
                placeholder={t.programs.durationWeeks}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} ${t.programs.weeks}`,
                }))}
              />
            </div>
            <div>
              <label className="label">{t.programs.mealsPerDay}</label>
              <FilterSelect
                value={String(mealsPerDay)}
                onChange={(v) => setMealsPerDay(Number(v))}
                placeholder={t.programs.mealsPerDay}
                options={Array.from({ length: 8 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} ${t.nutrition.meals_count}`,
                }))}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t.programs.nutritionSchedule}
          </h2>
          <div className="mt-4 space-y-6">
            {Object.entries(weekGroups).map(([weekStr, weekDays]) => (
              <div key={weekStr}>
                <h3 className="text-sm font-semibold text-gray-700">
                  {t.programs.week} {weekStr}
                </h3>
                <div className="mt-2 space-y-2">
                  {weekDays.map((slot) => (
                    <div
                      key={`${slot.weekNumber}-${slot.dayNumber}`}
                      className="card flex items-center gap-3 !py-3"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                        {slot.dayNumber}
                      </span>
                      <FilterSelect
                        value={slot.label}
                        onChange={(v) =>
                          updateLabel(slot.weekNumber, slot.dayNumber, v)
                        }
                        placeholder={t.programs.selectDay}
                        options={dayOptions}
                        className="w-36 flex-shrink-0"
                      />
                      <FilterSelect
                        value={slot.mealPlanId || ""}
                        onChange={(v) =>
                          updateDay(slot.weekNumber, slot.dayNumber, v || null)
                        }
                        placeholder={t.programs.selectMealPlan}
                        options={mealPlans.map((m) => ({
                          value: m.id,
                          label: `${m.name} (${m.mealCount} ${t.nutrition.meals_count})`,
                        }))}
                        className="flex-1"
                      />
                      {slot.mealPlanId && (
                        <button
                          onClick={() =>
                            updateDay(slot.weekNumber, slot.dayNumber, null)
                          }
                          className="rounded p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? t.common.saving : t.workouts.saveChanges}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/programs/nutrition/${params.id}`}>
              {t.common.cancel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
