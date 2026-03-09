"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Dumbbell } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.programs.programNamePlaceholder}
              className="input"
            />
          </div>
          <div>
            <label className="label">{t.common.description}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.programs.descriptionPlaceholder}
              className="input"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t.programs.durationWeeks}</label>
              <select
                value={durationWeeks}
                onChange={(e) => setDurationWeeks(Number(e.target.value))}
                className="input"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                  <option key={w} value={w}>
                    {w} {t.programs.weeks}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t.programs.trainingDays}</label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="input"
              >
                {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d} {t.programs.daysWeek}
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
                        <input
                          type="text"
                          value={slot.label}
                          onChange={(e) =>
                            updateLabel(slot.weekNumber, slot.dayNumber, e.target.value)
                          }
                          placeholder={`${t.programs.day} ${slot.dayNumber}`}
                          className="w-32 flex-shrink-0 rounded border border-gray-200 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none"
                        />
                        <select
                          value={slot.workoutPlanId || ""}
                          onChange={(e) =>
                            updateDay(
                              slot.weekNumber,
                              slot.dayNumber,
                              e.target.value || null
                            )
                          }
                          className="input flex-1 !py-1.5 text-sm"
                        >
                          <option value="">{t.programs.selectWorkout}</option>
                          {workouts.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.exerciseCount} {t.workouts.exercises_count})
                            </option>
                          ))}
                        </select>
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
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="btn-primary"
          >
            {saving ? t.common.saving : t.programs.createProgram}
          </button>
          <Link href="/dashboard/programs" className="btn-secondary">
            {t.common.cancel}
          </Link>
        </div>
      </div>
    </div>
  );
}
