"use client";

import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  User,
  Users,
  Power,
  Pause,
  Play,
  Download,
  Clock,
} from "lucide-react";
import type { ExerciseInput, AssignedWorkoutPlan } from "@/types";
import type { Translations } from "@/lib/i18n/bs";
import { ExerciseEditor } from "./exercise-editor";

interface WorkoutPlanCardProps {
  plan: AssignedWorkoutPlan;
  isOpen: boolean;
  isEditing: boolean;
  editName: string;
  editExercises: ExerciseInput[];
  saving: boolean;
  t: Translations;
  onToggle: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onEditExercisesChange: (exercises: ExerciseInput[]) => void;
  onToggleActive?: () => void;
  onTogglePause?: () => void;
  onToggleDownload?: () => void;
}

export function WorkoutPlanCard({
  plan,
  isOpen,
  isEditing,
  editName,
  editExercises,
  saving,
  t,
  onToggle,
  onStartEdit,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onEditExercisesChange,
  onToggleActive,
  onTogglePause,
  onToggleDownload,
}: WorkoutPlanCardProps) {
  const isPaused = !!plan.pausedAt;
  const daysLeft = plan.endDate
    ? Math.ceil((new Date(plan.endDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const exercises =
    plan.clientExercises.length > 0
      ? plan.clientExercises
      : plan.workoutPlan.exercises;
  const displayName = plan.customName || plan.workoutPlan.name;

  return (
    <div className="card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
            <Dumbbell className="h-5 w-5 text-brand-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex gap-2 text-xs text-gray-500">
              {plan.workoutPlan.sourceTemplate && (
                <span>{t.workouts.from}: {plan.workoutPlan.sourceTemplate.name}</span>
              )}
              <span>{exercises.length} {t.workouts.exercises_count}</span>
              <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                plan.mode === "live"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {plan.mode === "live" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {plan.mode === "live" ? t.workouts.live : t.workouts.solo}
              </span>
              {isPaused && (
                <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">{t.statuses.paused}</span>
              )}
              {!plan.isActive && !isPaused && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">{t.workouts.inactive}</span>
              )}
              {daysLeft !== null && plan.isActive && !isPaused && (
                <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                  daysLeft <= 3 ? "bg-red-100 text-red-700" : daysLeft <= 7 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"
                }`}>
                  <Clock className="h-3 w-3" />
                  {daysLeft > 0 ? `${daysLeft}d` : t.workouts.expired}
                </span>
              )}
              {!plan.allowDownload && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
                  <Download className="inline h-3 w-3 opacity-50" /> off
                </span>
              )}
            </div>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isOpen && !isEditing && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <button onClick={onStartEdit} className="btn-secondary text-xs">
              <Pencil className="mr-1 h-3 w-3" />
              {t.common.edit}
            </button>
            {onToggleActive && (
              <button
                onClick={onToggleActive}
                className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                  plan.isActive
                    ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "border-green-200 text-green-600 hover:bg-green-50"
                }`}
              >
                <Power className="mr-1 inline h-3 w-3" />
                {plan.isActive ? t.workouts.disable : t.workouts.enable}
              </button>
            )}
            {onTogglePause && plan.accessPolicy === "date_range" && (
              <button
                onClick={onTogglePause}
                className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                  isPaused
                    ? "border-green-200 text-green-600 hover:bg-green-50"
                    : "border-yellow-200 text-yellow-600 hover:bg-yellow-50"
                }`}
              >
                {isPaused ? <Play className="mr-1 inline h-3 w-3" /> : <Pause className="mr-1 inline h-3 w-3" />}
                {isPaused ? t.workouts.resume : t.workouts.pause}
              </button>
            )}
            {onToggleDownload && (
              <button
                onClick={onToggleDownload}
                className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                  plan.allowDownload
                    ? "border-gray-200 text-gray-600 hover:bg-gray-50"
                    : "border-brand-200 text-brand-600 hover:bg-brand-50"
                }`}
              >
                <Download className="mr-1 inline h-3 w-3" />
                {plan.allowDownload ? t.workouts.disableDownload : t.workouts.enableDownload}
              </button>
            )}
            <button
              onClick={onDelete}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              <Trash2 className="mr-1 inline h-3 w-3" />
              {t.workouts.remove}
            </button>
          </div>
          <div className="space-y-2">
            {exercises.map((ex, i) => (
              <div key={ex.id} className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{ex.name}</p>
                  <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                    {ex.sets && <span>{ex.sets} {t.workouts.setsLabel}</span>}
                    {ex.reps && <span>{ex.reps} {t.workouts.repsLabel}</span>}
                    {ex.weight && <span>{ex.weight}</span>}
                    {ex.restSeconds && <span>{ex.restSeconds}s {t.workouts.restLabel}</span>}
                  </div>
                  {ex.notes && (
                    <p className="mt-1 text-sm italic text-gray-400">{ex.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && isEditing && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3">
            <label className="text-xs text-gray-500">{t.workouts.planName}</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="input mt-0.5"
            />
          </div>
          <ExerciseEditor
            exercises={editExercises}
            onChange={onEditExercisesChange}
            t={t}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="btn-primary text-sm"
            >
              <Check className="mr-1 h-4 w-4" />
              {saving ? t.common.saving : t.workouts.saveChanges}
            </button>
            <button onClick={onCancelEdit} className="btn-secondary text-sm">
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
