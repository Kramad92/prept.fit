"use client";

import { useState } from "react";
import { Dumbbell, Plus, FileDown } from "lucide-react";
import { TemplatePickerModal } from "./template-picker-modal";
import { WorkoutPlanCard } from "./workout-plan-card";
import { CustomWorkoutForm } from "./custom-workout-form";
import type { Exercise, ExerciseInput, AssignedWorkoutPlan } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useLocale } from "@/lib/i18n";
import { api } from "@/lib/api";

interface ClientWorkoutTabProps {
  clientId: string;
  assignedPlans: AssignedWorkoutPlan[];
  onRefresh: () => void;
}

export function ClientWorkoutTab({ clientId, assignedPlans, onRefresh }: ClientWorkoutTabProps) {
  const { toastSuccess, toastError } = useToast();
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(
    assignedPlans.length > 0 ? assignedPlans[0].id : null
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  // Custom plan form state
  const [customExercises, setCustomExercises] = useState<ExerciseInput[]>([]);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editExercises, setEditExercises] = useState<ExerciseInput[]>([]);
  const [editName, setEditName] = useState("");

  async function handleAssignTemplate(templateId: string, mode?: string, aiAdjust?: boolean, opts?: { accessPolicy?: string; startDate?: string; endDate?: string }) {
    setAssigning(true);
    try {
      await api.post(`/api/clients/${clientId}/workouts`, {
        workoutPlanId: templateId,
        mode: mode || "solo",
        aiAdjust: aiAdjust ?? false,
        locale,
        accessPolicy: opts?.accessPolicy,
        startDate: opts?.startDate || null,
        endDate: opts?.endDate || null,
      });
      toastSuccess(t.workouts.templateAssigned);
    } catch {
      toastError(t.workouts.failedToAssign);
    }
    setShowTemplatePicker(false);
    setAssigning(false);
    onRefresh();
  }

  async function handleToggleActive(planId: string, currentlyActive: boolean) {
    try {
      await api.put(`/api/clients/${clientId}/workouts/${planId}`, {
        isActive: !currentlyActive,
      });
      onRefresh();
    } catch {
      toastError(t.workouts.failedToSave);
    }
  }

  async function handleTogglePause(planId: string, isPaused: boolean) {
    try {
      await api.put(`/api/clients/${clientId}/workouts/${planId}`, {
        paused: !isPaused,
      });
      onRefresh();
    } catch {
      toastError(t.workouts.failedToSave);
    }
  }

  async function handleToggleDownload(planId: string, currentlyAllowed: boolean) {
    try {
      await api.put(`/api/clients/${clientId}/workouts/${planId}`, {
        allowDownload: !currentlyAllowed,
      });
      onRefresh();
    } catch {
      toastError(t.workouts.failedToSave);
    }
  }

  async function handleCreateCustom(data: {
    name: string;
    description: string;
    mode: "solo" | "live";
    exercises: ExerciseInput[];
  }) {
    setSaving(true);
    try {
      await api.post(`/api/clients/${clientId}/workouts`, {
        name: data.name,
        mode: data.mode,
        exercises: data.exercises
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
        <CustomWorkoutForm
          exercises={customExercises}
          saving={saving}
          t={t}
          onSubmit={handleCreateCustom}
          onClose={() => setShowCustomForm(false)}
          onExercisesChange={setCustomExercises}
        />
      )}

      {/* Plan Cards */}
      <div className="space-y-3">
        {assignedPlans.map((plan) => (
          <WorkoutPlanCard
            key={plan.id}
            plan={plan}
            isOpen={expanded === plan.id}
            isEditing={editingPlanId === plan.id}
            editName={editName}
            editExercises={editExercises}
            saving={saving}
            t={t}
            onToggle={() => setExpanded(expanded === plan.id ? null : plan.id)}
            onStartEdit={() => startEdit(plan)}
            onDelete={() => handleDelete(plan.id)}
            onSaveEdit={() => handleSaveEdit(plan.id)}
            onCancelEdit={() => setEditingPlanId(null)}
            onEditNameChange={setEditName}
            onEditExercisesChange={setEditExercises}
            onToggleActive={() => handleToggleActive(plan.id, plan.isActive)}
            onTogglePause={() => handleTogglePause(plan.id, !!plan.pausedAt)}
            onToggleDownload={() => handleToggleDownload(plan.id, plan.allowDownload)}
          />
        ))}
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
