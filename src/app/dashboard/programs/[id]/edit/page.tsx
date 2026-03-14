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

interface WorkoutOption {
  id: string;
  name: string;
  description: string | null;
  exerciseCount: number;
}

interface ProgramDay {
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  workoutPlanId: string | null;
  workoutPlan: { id: string; name: string } | null;
}

interface ProgramDetail {
  id: string;
  name: string;
  description: string | null;
  durationWeeks: number;
  daysPerWeek: number;
  days: ProgramDay[];
}

interface DaySlot {
  weekNumber: number;
  dayNumber: number;
  label: string;
  workoutPlanId: string | null;
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

export default function EditProgramPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [days, setDays] = useState<DaySlot[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProgramDetail>(`/api/programs/${params.id}`),
      api.get<WorkoutOption[]>("/api/workouts"),
    ])
      .then(([prog, w]) => {
        setName(prog.name);
        setDescription(prog.description || "");
        setDurationWeeks(prog.durationWeeks);
        setDaysPerWeek(prog.daysPerWeek);
        setWorkouts(w);

        // Build day slots from existing data
        const slots: DaySlot[] = [];
        for (let wk = 1; wk <= prog.durationWeeks; wk++) {
          for (let d = 1; d <= prog.daysPerWeek; d++) {
            const existing = prog.days.find(
              (pd) => pd.weekNumber === wk && pd.dayNumber === d
            );
            slots.push({
              weekNumber: wk,
              dayNumber: d,
              label: existing?.label || "",
              workoutPlanId: existing?.workoutPlanId || null,
            });
          }
        }
        setDays(slots);
      })
      .catch(() => router.push("/dashboard/programs"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Regenerate grid when weeks/days change (preserve existing assignments)
  useEffect(() => {
    if (loading) return;
    setDays((prev) => {
      const newDays: DaySlot[] = [];
      for (let w = 1; w <= durationWeeks; w++) {
        for (let d = 1; d <= daysPerWeek; d++) {
          const existing = prev.find(
            (s) => s.weekNumber === w && s.dayNumber === d
          );
          newDays.push(
            existing || {
              weekNumber: w,
              dayNumber: d,
              label: "",
              workoutPlanId: null,
            }
          );
        }
      }
      return newDays;
    });
  }, [durationWeeks, daysPerWeek, loading]);

  function updateDay(week: number, day: number, workoutPlanId: string | null) {
    setDays((prev) =>
      prev.map((s) =>
        s.weekNumber === week && s.dayNumber === day
          ? { ...s, workoutPlanId }
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
      await api.put(`/api/programs/${params.id}`, {
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
      });
      router.push(`/dashboard/programs/${params.id}`);
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
        href={`/dashboard/programs/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.programs.backToProgram}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        {t.programs.editProgram}
      </h1>

      <div className="mt-6 space-y-6">
        <div className="card space-y-4">
          <div>
            <label className="label">{t.programs.programName}</label>
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

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t.programs.schedule}
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
                      className="card !py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                          {slot.dayNumber}
                        </span>
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[9rem_1fr]">
                          <FilterSelect
                            value={slot.label}
                            onChange={(v) =>
                              updateLabel(slot.weekNumber, slot.dayNumber, v)
                            }
                            placeholder={t.programs.selectDay}
                            options={dayOptions}
                          />
                          <FilterSelect
                            value={slot.workoutPlanId || ""}
                            onChange={(v) =>
                              updateDay(slot.weekNumber, slot.dayNumber, v || null)
                            }
                            placeholder={t.programs.selectWorkout}
                            options={workouts.map((w) => ({
                              value: w.id,
                              label: `${w.name} (${w.exerciseCount} ${t.workouts.exercises_count})`,
                            }))}
                          />
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
            <Link href={`/dashboard/programs/${params.id}`}>
              {t.common.cancel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
