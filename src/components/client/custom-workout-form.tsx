"use client";

import { useState } from "react";
import { X, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIGenerateWorkout } from "@/components/ai/ai-generate-workout";
import { ExerciseEditor } from "./exercise-editor";
import type { ExerciseInput } from "@/types";
import type { Translations } from "@/lib/i18n/bs";

interface CustomWorkoutFormProps {
  exercises: ExerciseInput[];
  saving: boolean;
  t: Translations;
  onSubmit: (data: {
    name: string;
    description: string;
    mode: "solo" | "live";
    exercises: ExerciseInput[];
  }) => void;
  onClose: () => void;
  onExercisesChange: (exercises: ExerciseInput[]) => void;
}

export function CustomWorkoutForm({
  exercises,
  saving,
  t,
  onSubmit,
  onClose,
  onExercisesChange,
}: CustomWorkoutFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignMode, setAssignMode] = useState<"solo" | "live">("solo");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, description, mode: assignMode, exercises });
  }

  return (
    <div className="card mb-4 border-2 border-brand-200">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">{t.workouts.newCustomPlan}</h4>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.workouts.planName}
          />
        </div>
        <div className="mt-2">
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.workouts.aiPromptPlaceholder}
            className="text-sm"
          />
          <div className="mt-1.5">
            <AIGenerateWorkout
              prompt={description}
              onGenerate={(data) => {
                if (!name && data.name) setName(data.name);
                setDescription(data.description || description);
                onExercisesChange(data.exercises);
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
          <ExerciseEditor
            exercises={exercises}
            onChange={onExercisesChange}
            t={t}
          />
        </div>
        <Button type="submit" disabled={saving} className="mt-4 w-full">
          {saving ? t.workouts.creating : t.workouts.createPlan}
        </Button>
      </form>
    </div>
  );
}
