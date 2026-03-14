"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { AIGenerateProgram } from "@/components/ai/ai-generate-program";

interface WorkoutOption {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
}

interface DaySlot {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutPlanId: string | null;
  workoutName: string | null;
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

export default function NewProgramPage() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<DaySlot[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  useEffect(() => {
    api.get<WorkoutOption[]>("/api/workouts").then(setWorkouts).catch(() => {});
  }, []);

  // Generate day grid when weeks/days change
  useEffect(() => {
    const newDays: DaySlot[] = [];
    for (let w = 1; w <= durationWeeks; w++) {
      for (let d = 1; d <= daysPerWeek; d++) {
        const existing = days.find((s) => s.weekNumber === w && s.dayNumber === d);
        newDays.push(
          existing || {
            weekNumber: w,
            dayNumber: d,
            label: "",
            workoutPlanId: null,
            workoutName: null,
          }
        );
      }
    }
    setDays(newDays);
  }, [durationWeeks, daysPerWeek]);

  function updateDay(week: number, day: number, workoutPlanId: string | null) {
    setDays((prev) =>
      prev.map((s) => {
        if (s.weekNumber === week && s.dayNumber === day) {
          const workout = workouts.find((w) => w.id === workoutPlanId);
          return {
            ...s,
            workoutPlanId,
            workoutName: workout?.name || null,
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
      workoutPlanId: string | null;
      workoutName: string | null;
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
            workoutPlanId: aiDay.workoutPlanId,
            workoutName: aiDay.workoutName,
          };
        }
        return slot;
      })
    );
  }

  // Smart auto-fill: rotation when too few workouts for AI to add value
  function handleAutoFill() {
    if (workouts.length === 0) return;
    const dayLabels = DAY_KEYS.map((key) => t.programs[key]);

    setDays((prev) =>
      prev.map((slot) => {
        const globalIndex = (slot.weekNumber - 1) * daysPerWeek + (slot.dayNumber - 1);
        const workout = workouts[globalIndex % workouts.length];
        return {
          ...slot,
          label: slot.label || dayLabels[slot.dayNumber - 1],
          workoutPlanId: workout.id,
          workoutName: workout.name,
        };
      })
    );
  }

  // Should we skip AI and just auto-fill?
  const shouldAutoFill = workouts.length > 0 && workouts.length <= Math.floor(daysPerWeek / 2);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description: aiDescription || description || null,
        durationWeeks,
        daysPerWeek,
        days: days
          .filter((d) => d.workoutPlanId)
          .map((d) => ({
            weekNumber: d.weekNumber,
            dayNumber: d.dayNumber,
            label: d.label || null,
            workoutPlanId: d.workoutPlanId,
          })),
      };
      const result = await api.post<{ id: string }>("/api/programs", payload);
      router.push(`/dashboard/programs/${result.id}`);
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
        {t.programs.createProgram}
      </h1>

      <div className="mt-6 space-y-6">
        {/* Basic Info */}
        <div className="card space-y-4">
          <div>
            <label className="label">{t.programs.programName}</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.programs.programNamePlaceholder}
            />
          </div>
          <div>
            <label className="label">{aiDescription ? (t.common.aiPromptLabel || "AI Prompt") : t.common.description}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.programs.descriptionPlaceholder}
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
              ) : workouts.length > 0 ? (
                <AIGenerateProgram
                  prompt={description}
                  durationWeeks={durationWeeks}
                  daysPerWeek={daysPerWeek}
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
              <label className="label">{t.programs.trainingDays}</label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                {Array.from({ length: 7 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {t.programs.daysWeek}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Week/Day Grid */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t.programs.schedule}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t.programs.scheduleDesc}
          </p>

          {workouts.length === 0 ? (
            <div className="mt-4 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <p className="text-sm text-gray-500">
                {t.workouts.noPlans}
              </p>
              <Link
                href="/dashboard/workouts/new"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                {t.workouts.createWorkoutPlan}
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
                            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
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
                                value={slot.workoutPlanId || ""}
                                onChange={(e) =>
                                  updateDay(
                                    slot.weekNumber,
                                    slot.dayNumber,
                                    e.target.value || null
                                  )
                                }
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                              >
                                <option value="">{t.programs.selectWorkout}</option>
                                {workouts.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.name} ({w.exerciseCount} {t.workouts.exercises_count})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {slot.workoutPlanId && (
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
