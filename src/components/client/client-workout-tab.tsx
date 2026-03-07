"use client";

import { useState } from "react";
import {
  Dumbbell,
  Plus,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Check,
  FileDown,
  User,
  Users,
} from "lucide-react";
import { TemplatePickerModal } from "./template-picker-modal";
import { ExercisePicker } from "./exercise-picker";
import { ExerciseNameInput } from "./exercise-name-input";
import { AIGenerateWorkout } from "@/components/ai/ai-generate-workout";
import type { Exercise, ExerciseInput, AssignedWorkoutPlan } from "@/types";
import { createEmptyExercise } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";

interface ClientWorkoutTabProps {
  clientId: string;
  assignedPlans: AssignedWorkoutPlan[];
  onRefresh: () => void;
}

export function ClientWorkoutTab({ clientId, assignedPlans, onRefresh }: ClientWorkoutTabProps) {
  const { toastSuccess, toastError } = useToast();
  const t = useT();
  const [expanded, setExpanded] = useState<string | null>(
    assignedPlans.length > 0 ? assignedPlans[0].id : null
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Custom plan form state
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customExercises, setCustomExercises] = useState<ExerciseInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [assignMode, setAssignMode] = useState<"solo" | "live">("solo");

  // Edit form state
  const [editExercises, setEditExercises] = useState<ExerciseInput[]>([]);
  const [editName, setEditName] = useState("");

  async function handleAssignTemplate(templateId: string, mode?: string) {
    setAssigning(true);
    try {
      await api.post(`/api/clients/${clientId}/workouts`, { workoutPlanId: templateId, mode: mode || "solo" });
      toastSuccess(t.workouts.templateAssigned);
    } catch {
      toastError(t.workouts.failedToAssign);
    }
    setShowTemplatePicker(false);
    setAssigning(false);
    onRefresh();
  }

  async function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/clients/${clientId}/workouts`, {
        name: customName,
        mode: assignMode,
        exercises: customExercises
          .filter((ex) => ex.name.trim())
          .map((ex, i) => ({
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
            notes: ex.notes || null,
            videoUrl: ex.videoUrl || null,
            orderIndex: i,
          })),
      });
      toastSuccess(t.workouts.customPlanCreated);
      setShowCustomForm(false);
      setCustomName("");
      setCustomExercises([]);
      onRefresh();
    } catch {
      toastError(t.workouts.failedToCreate);
    }
    setSaving(false);
  }

  function startEdit(plan: AssignedWorkoutPlan) {
    const exercises: Exercise[] = plan.clientExercises.length > 0 ? plan.clientExercises : plan.workoutPlan.exercises;
    setEditingPlanId(plan.id);
    setEditName(plan.customName || plan.workoutPlan.name);
    setEditExercises(
      exercises.map((ex) => ({
        tempId: ex.id,
        name: ex.name,
        sets: ex.sets?.toString() || "",
        reps: ex.reps || "",
        weight: ex.weight || "",
        restSeconds: ex.restSeconds?.toString() || "",
        notes: ex.notes || "",
        videoUrl: ex.videoUrl || "",
      }))
    );
  }

  async function handleSaveEdit(planId: string) {
    setSaving(true);
    try {
      await api.put(`/api/clients/${clientId}/workouts/${planId}`, {
        customName: editName,
        exercises: editExercises
          .filter((ex) => ex.name.trim())
          .map((ex, i) => ({
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            restSeconds: ex.restSeconds ? parseInt(ex.restSeconds) : null,
            notes: ex.notes || null,
            videoUrl: ex.videoUrl || null,
            orderIndex: i,
          })),
      });
      toastSuccess(t.workouts.workoutPlanSaved);
      setEditingPlanId(null);
      onRefresh();
    } catch {
      toastError(t.workouts.failedToSave);
    }
    setSaving(false);
  }

  async function handleDelete(planId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/workouts/${planId}`);
      toastSuccess(t.assign.planRemoved);
      onRefresh();
    } catch {
      toastError(t.workouts.failedToRemove);
    }
  }

  function updateExercise(
    list: ExerciseInput[],
    setList: (v: ExerciseInput[]) => void,
    tempId: string,
    field: keyof ExerciseInput,
    value: string
  ) {
    setList(list.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e)));
  }

  function renderExerciseEditor(
    exercises: ExerciseInput[],
    setExercises: (v: ExerciseInput[]) => void
  ) {
    return (
      <div className="space-y-3">
        <ExercisePicker
          onSelect={(ex) => {
            const newEx = createEmptyExercise();
            newEx.name = ex.name;
            setExercises([...exercises, newEx]);
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
                onChange={(v) => updateExercise(exercises, setExercises, ex.tempId, "name", v)}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setExercises(exercises.filter((e) => e.tempId !== ex.tempId))}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
              <div>
                <label className="text-xs text-gray-500">{t.workouts.sets}</label>
                <input type="number" value={ex.sets} onChange={(e) => updateExercise(exercises, setExercises, ex.tempId, "sets", e.target.value)} placeholder="3" className="input mt-0.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.workouts.reps}</label>
                <input type="text" value={ex.reps} onChange={(e) => updateExercise(exercises, setExercises, ex.tempId, "reps", e.target.value)} placeholder="8-12" className="input mt-0.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.workouts.weight}</label>
                <input type="text" value={ex.weight} onChange={(e) => updateExercise(exercises, setExercises, ex.tempId, "weight", e.target.value)} placeholder="135lbs" className="input mt-0.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">{t.workouts.restSec}</label>
                <input type="number" value={ex.restSeconds} onChange={(e) => updateExercise(exercises, setExercises, ex.tempId, "restSeconds", e.target.value)} placeholder="60" className="input mt-0.5 text-sm" />
              </div>
            </div>
            <div className="mt-2">
              <input type="text" value={ex.notes} onChange={(e) => updateExercise(exercises, setExercises, ex.tempId, "notes", e.target.value)} placeholder={t.common.notesPlaceholder} className="input text-sm" />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setExercises([...exercises, createEmptyExercise()])}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
        >
          <Plus className="h-4 w-4" />
          {t.workouts.addExerciseManually}
        </button>
      </div>
    );
  }

  if (assignedPlans.length === 0 && !showCustomForm) {
    return (
      <div>
        <div className="card flex flex-col items-center py-8 text-center">
          <Dumbbell className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.workouts.noPlansAssigned}</p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => setShowTemplatePicker(true)} className="btn-primary">
              <FileDown className="mr-2 h-4 w-4" />
              {t.workouts.assignFromTemplate}
            </button>
            <button
              onClick={() => {
                setShowCustomForm(true);
                setCustomExercises([]);
              }}
              className="btn-secondary"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.workouts.createCustomPlan}
            </button>
          </div>
        </div>
        {showTemplatePicker && (
          <TemplatePickerModal
            type="workout"
            onSelect={handleAssignTemplate}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.workouts.workoutPlans} ({assignedPlans.length})
        </h3>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplatePicker(true)} className="btn-secondary text-sm">
            <FileDown className="mr-1 h-4 w-4" />
            {t.workouts.fromTemplate}
          </button>
          <button
            onClick={() => {
              setShowCustomForm(true);
              setCustomExercises([]);
            }}
            className="btn-primary text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t.workouts.customPlan}
          </button>
        </div>
      </div>

      {/* Custom Plan Form */}
      {showCustomForm && (
        <div className="card mb-4 border-2 border-brand-200">
          <form onSubmit={handleCreateCustom}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{t.workouts.newCustomPlan}</h4>
              <button type="button" onClick={() => setShowCustomForm(false)} className="rounded p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3">
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t.workouts.planName}
                className="input"
              />
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder={t.workouts.aiPromptPlaceholder}
                className="input text-sm"
              />
              <div className="mt-1.5">
                <AIGenerateWorkout
                  prompt={customDescription}
                  onGenerate={(data) => {
                    if (!customName && data.name) setCustomName(data.name);
                    setCustomDescription(data.description || customDescription);
                    setCustomExercises(data.exercises);
                  }}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-xs text-gray-500">{t.workouts.workoutMode}</label>
              <div className="mt-1 flex gap-2">
                <button type="button" onClick={() => setAssignMode("solo")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${assignMode === "solo" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <User className="h-4 w-4" /> {t.workouts.solo}
                </button>
                <button type="button" onClick={() => setAssignMode("live")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${assignMode === "live" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  <Users className="h-4 w-4" /> {t.workouts.liveWithCoach}
                </button>
              </div>
            </div>
            <div className="mt-3">
              {renderExerciseEditor(customExercises, setCustomExercises)}
            </div>
            <button type="submit" disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? t.workouts.creating : t.workouts.createPlan}
            </button>
          </form>
        </div>
      )}

      {/* Plan Cards */}
      <div className="space-y-3">
        {assignedPlans.map((plan) => {
          const isOpen = expanded === plan.id;
          const isEditing = editingPlanId === plan.id;
          const exercises = plan.clientExercises.length > 0
            ? plan.clientExercises
            : plan.workoutPlan.exercises;
          const displayName = plan.customName || plan.workoutPlan.name;

          return (
            <div key={plan.id} className="card">
              <button
                onClick={() => setExpanded(isOpen ? null : plan.id)}
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
                      {!plan.isActive && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">{t.workouts.inactive}</span>
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
                  <div className="mb-3 flex gap-2">
                    <button onClick={() => startEdit(plan)} className="btn-secondary text-xs">
                      <Pencil className="mr-1 h-3 w-3" />
                      {t.common.edit}
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
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
                      onChange={(e) => setEditName(e.target.value)}
                      className="input mt-0.5"
                    />
                  </div>
                  {renderExerciseEditor(editExercises, setEditExercises)}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(plan.id)}
                      disabled={saving}
                      className="btn-primary text-sm"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      {saving ? t.common.saving : t.workouts.saveChanges}
                    </button>
                    <button onClick={() => setEditingPlanId(null)} className="btn-secondary text-sm">
                      {t.common.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showTemplatePicker && (
        <TemplatePickerModal
          type="workout"
          onSelect={handleAssignTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </div>
  );
}
