"use client";

import { Plus, Trash2 } from "lucide-react";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseNameInput } from "./exercise-name-input";
import type { ExerciseInput } from "@/types";
import type { Translations } from "@/lib/i18n/bs";
import { createEmptyExercise } from "@/lib/utils";

interface ExerciseEditorProps {
  exercises: ExerciseInput[];
  onChange: (exercises: ExerciseInput[]) => void;
  t: Translations;
}

function updateExercise(
  list: ExerciseInput[],
  tempId: string,
  field: keyof ExerciseInput,
  value: string
): ExerciseInput[] {
  return list.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e));
}

export function ExerciseEditor({ exercises, onChange, t }: ExerciseEditorProps) {
  return (
    <div className="space-y-3">
      <ExercisePicker
        onSelect={(ex) => {
          const newEx = createEmptyExercise();
          newEx.name = ex.name;
          onChange([...exercises, newEx]);
        }}
      />
      {exercises.map((ex, index) => (
        <div key={ex.tempId} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
              {index + 1}
            </span>
            <ExerciseNameInput
              value={ex.name}
              onChange={(v) => onChange(updateExercise(exercises, ex.tempId, "name", v))}
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => onChange(exercises.filter((e) => e.tempId !== ex.tempId))}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            <div>
              <label className="text-xs text-gray-500">{t.workouts.sets}</label>
              <input type="number" value={ex.sets} onChange={(e) => onChange(updateExercise(exercises, ex.tempId, "sets", e.target.value))} placeholder="3" className="input mt-0.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t.workouts.reps}</label>
              <input type="text" value={ex.reps} onChange={(e) => onChange(updateExercise(exercises, ex.tempId, "reps", e.target.value))} placeholder="8-12" className="input mt-0.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t.workouts.weight}</label>
              <input type="text" value={ex.weight} onChange={(e) => onChange(updateExercise(exercises, ex.tempId, "weight", e.target.value))} placeholder="135lbs" className="input mt-0.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t.workouts.restSec}</label>
              <input type="number" value={ex.restSeconds} onChange={(e) => onChange(updateExercise(exercises, ex.tempId, "restSeconds", e.target.value))} placeholder="60" className="input mt-0.5 text-sm" />
            </div>
          </div>
          <div className="mt-2">
            <input type="text" value={ex.notes} onChange={(e) => onChange(updateExercise(exercises, ex.tempId, "notes", e.target.value))} placeholder={t.common.notesPlaceholder} className="input text-sm" />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...exercises, createEmptyExercise()])}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
      >
        <Plus className="h-4 w-4" />
        {t.workouts.addExerciseManually}
      </button>
    </div>
  );
}
