"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
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
    setName(data.name);
    setDescription(data.description);

    // Merge AI-generated days into the current grid
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

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
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

  const dayOptions = DAY_KEYS.map((key) => ({
    value: t.programs[key],
    label: t.programs[key],
  }));

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
            <label className="label">{t.common.description}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.programs.descriptionPlaceholder}
              rows={2}
            />
            <div className="mt-2">
              <AIGenerateProgram
                prompt={description}
                durationWeeks={durationWeeks}
                daysPerWeek={daysPerWeek}
                onGenerate={handleAIGenerate}
              />
            </div>
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
              <label className="label">{t.programs.trainingDays}</label>
              <FilterSelect
                value={String(daysPerWeek)}
                onChange={(v) => setDaysPerWeek(Number(v))}
                placeholder={t.programs.trainingDays}
                options={Array.from({ length: 7 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1} ${t.programs.daysWeek}`,
                }))}
              />
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
                        className="card flex items-center gap-3 !py-3"
                      >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
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
                          value={slot.workoutPlanId || ""}
                          onChange={(v) =>
                            updateDay(
                              slot.weekNumber,
                              slot.dayNumber,
                              v || null
                            )
                          }
                          placeholder={t.programs.selectWorkout}
                          options={workouts.map((w) => ({
                            value: w.id,
                            label: `${w.name} (${w.exerciseCount} ${t.workouts.exercises_count})`,
                          }))}
                          className="flex-1"
                        />
                        {slot.workoutPlanId && (
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
              );
            })}
          </div>
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
