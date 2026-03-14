"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AIGenerateNutritionProgram } from "@/components/ai/ai-generate-nutrition-program";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

interface MealPlanOption {
  id: string;
  name: string;
  description: string | null;
  mealCount: number;
}

interface DaySlot {
  weekNumber: number;
  dayNumber: number;
  label: string;
  mealPlanId: string | null;
  mealPlanName: string | null;
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

export default function NewNutritionProgramPage() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [days, setDays] = useState<DaySlot[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlanOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  useEffect(() => {
    api.get<MealPlanOption[]>("/api/meal-plans").then(setMealPlans).catch(() => {});
  }, []);

  // Generate day grid when weeks change (7 days per week for nutrition)
  useEffect(() => {
    const newDays: DaySlot[] = [];
    for (let w = 1; w <= durationWeeks; w++) {
      for (let d = 1; d <= 7; d++) {
        const existing = days.find((s) => s.weekNumber === w && s.dayNumber === d);
        newDays.push(
          existing || {
            weekNumber: w,
            dayNumber: d,
            label: "",
            mealPlanId: null,
            mealPlanName: null,
          }
        );
      }
    }
    setDays(newDays);
  }, [durationWeeks]);

  function updateDay(week: number, day: number, mealPlanId: string | null) {
    setDays((prev) =>
      prev.map((s) => {
        if (s.weekNumber === week && s.dayNumber === day) {
          const plan = mealPlans.find((m) => m.id === mealPlanId);
          return {
            ...s,
            mealPlanId,
            mealPlanName: plan?.name || null,
          };
        }
        return s;
      })
    );
  }

  function updateLabel(week: number, day: number, label: string) {
    setDays((prev) =>
      prev.map((s) =>
        s.weekNumber === week && s.dayNumber === day ? { ...s, label } : s
      )
    );
  }

  function handleAIGenerate(data: {
    name: string;
    description: string;
    days: {
      weekNumber: number;
      dayNumber: number;
      label: string;
      mealPlanId: string | null;
      mealPlanName: string | null;
    }[];
  }) {
    if (!name) setName(data.name);
    setAiDescription(data.description || "");

    setDays((prev) =>
      prev.map((slot) => {
        const aiDay = data.days.find(
          (d) => d.weekNumber === slot.weekNumber && d.dayNumber === slot.dayNumber
        );
        if (aiDay) {
          return {
            ...slot,
            label: aiDay.label || slot.label,
            mealPlanId: aiDay.mealPlanId,
            mealPlanName: aiDay.mealPlanName,
          };
        }
        return slot;
      })
    );
  }

  // Smart auto-fill: rotation when too few plans for AI to add value
  function handleAutoFill() {
    if (mealPlans.length === 0) return;
    const dayLabels = DAY_KEYS.map((key) => t.programs[key]);

    setDays((prev) =>
      prev.map((slot) => {
        const globalIndex = (slot.weekNumber - 1) * 7 + (slot.dayNumber - 1);
        const plan = mealPlans[globalIndex % mealPlans.length];
        return {
          ...slot,
          label: slot.label || dayLabels[slot.dayNumber - 1],
          mealPlanId: plan.id,
          mealPlanName: plan.name,
        };
      })
    );
  }

  // Should we skip AI and just auto-fill?
  const shouldAutoFill = mealPlans.length > 0 && mealPlans.length <= Math.floor(7 / 2);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description: aiDescription || description || null,
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
      };
      const result = await api.post<{ id: string }>("/api/nutrition-programs", payload);
      router.push(`/dashboard/programs/nutrition/${result.id}`);
    } catch {
      // handled by api client
    }
    setSaving(false);
  }

  const weekGroups: Record<number, DaySlot[]> = {};
  for (const d of days) {
    if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
    weekGroups[d.weekNumber].push(d);
  }

  const dayLabels = DAY_KEYS.map((key) => t.programs[key]);

  return (
    <div>
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.programs.backToPrograms}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        {t.programs.newNutritionProgram}
      </h1>

      <div className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <div>
            <label className="label">{t.programs.nutritionProgramName}</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.programs.nutritionProgramNamePlaceholder}
            />
          </div>
          <div>
            <label className="label">{aiDescription ? (t.common.aiPromptLabel || "AI Prompt") : t.common.description}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.programs.nutritionProgramDescPlaceholder}
              rows={2}
            />
            <div className="mt-2">
              {shouldAutoFill ? (
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                >
                  {t.programs.generateWithAI}
                </button>
              ) : mealPlans.length > 0 ? (
                <AIGenerateNutritionProgram
                  prompt={description}
                  durationWeeks={durationWeeks}
                  mealsPerDay={mealsPerDay}
                  onGenerate={handleAIGenerate}
                />
              ) : null}
            </div>
          </div>
          {aiDescription && (
            <div>
              <label className="label">{t.common.clientDescription || "Client description"}</label>
              <Textarea value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} rows={2} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t.programs.durationWeeks}</label>
              <select
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {t.programs.weeks}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t.programs.mealsPerDay}</label>
              <select
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(Number(e.target.value))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {t.nutrition.meals_count}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Week/Day Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t.programs.nutritionSchedule}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t.programs.nutritionScheduleDesc}
          </p>

          {mealPlans.length === 0 ? (
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">
                {t.nutrition.noPlans}
              </p>
              <Link
                href="/dashboard/nutrition"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                {t.nutrition.createMealPlan}
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-6">
              {Object.entries(weekGroups).map(([weekStr, weekDays]) => {
                const week = Number(weekStr);
                return (
                  <div key={week}>
                    <h3 className="text-sm font-semibold text-gray-700">
                      {t.programs.week} {week}
                    </h3>
                    <div className="mt-2 space-y-2">
                      {weekDays.map((slot) => (
                        <div
                          key={`${slot.weekNumber}-${slot.dayNumber}`}
                          className="card !py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                              {slot.dayNumber}
                            </span>
                            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr]">
                              <select
                                value={slot.label}
                                onChange={(e) =>
                                  updateLabel(slot.weekNumber, slot.dayNumber, e.target.value)
                                }
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                              >
                                <option value="">{t.programs.selectDay}</option>
                                {dayLabels.map((label) => (
                                  <option key={label} value={label}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={slot.mealPlanId || ""}
                                onChange={(e) =>
                                  updateDay(
                                    slot.weekNumber,
                                    slot.dayNumber,
                                    e.target.value || null
                                  )
                                }
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                              >
                                <option value="">{t.programs.selectMealPlan}</option>
                                {mealPlans.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.mealCount} {t.nutrition.meals_count})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {slot.mealPlanId && (
                              <button
                                onClick={() =>
                                  updateDay(slot.weekNumber, slot.dayNumber, null)
                                }
                                className="flex-shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving ? t.common.saving : t.programs.createProgram}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/programs">
              {t.common.cancel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
