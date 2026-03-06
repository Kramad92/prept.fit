"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, GripVertical, Trash2 } from "lucide-react";
import { ExercisePicker } from "@/components/client/exercise-picker";
import { ExerciseNameInput } from "@/components/client/exercise-name-input";
import type { ExerciseInput } from "@/types";
import { createEmptyExercise } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function NewWorkoutPage() {
  const router = useRouter();
  const { toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [exercises, setExercises] = useState<ExerciseInput[]>([]);

  function addExercise() {
    const ex = createEmptyExercise();
    setExercises((prev) => [...prev, ex]);
    setTimeout(() => {
      const el = document.querySelector(`[data-ex-name="${ex.tempId}"]`) as HTMLInputElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
    }, 50);
  }

  function removeExercise(tempId: string) {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId));
  }

  function updateExercise(
    tempId: string,
    field: keyof ExerciseInput,
    value: string
  ) {
    setExercises((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e))
    );
  }

  function addFromLibrary(lib: { name: string }) {
    const newEx = createEmptyExercise();
    newEx.name = lib.name;
    setExercises((prev) => [...prev, newEx]);
    setTimeout(() => {
      const el = document.querySelector(`[data-ex-sets="${newEx.tempId}"]`) as HTMLInputElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      el?.select();
    }, 50);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      isTemplate: formData.get("isTemplate") === "on",
      exercises: exercises
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
    };

    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const plan = await res.json();
        router.push(`/dashboard/workouts/${plan.id}`);
      } else {
        const err = await res.json().catch(() => null);
        toastError(err?.error || "Failed to create workout plan");
      }
    } catch {
      toastError("Failed to create workout plan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/workouts"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workouts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Create Workout Plan
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Plan Name *
            </label>
            <input
              type="text"
              name="name"
              required
              className="input mt-1"
              placeholder="Upper Body Strength"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              className="input mt-1"
              placeholder="Describe this workout plan..."
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isTemplate"
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              Save as reusable template
            </span>
          </label>
        </div>

        {/* Exercises */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exercises</h2>

          {/* Library Picker */}
          <div className="mt-3 max-w-lg">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Add from Exercise Library
            </label>
            <ExercisePicker onSelect={addFromLibrary} />
          </div>

          <div className="mt-4 space-y-3">
            {exercises.map((ex, index) => (
              <div key={ex.tempId} className="card">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 h-5 w-5 flex-shrink-0 text-gray-300" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <ExerciseNameInput
                        value={ex.name}
                        onChange={(v) => updateExercise(ex.tempId, "name", v)}
                        className="input flex-1"
                        data-ex-name={ex.tempId}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            (document.querySelector(`[data-ex-sets="${ex.tempId}"]`) as HTMLInputElement)?.focus();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeExercise(ex.tempId)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <div>
                        <label className="text-xs text-gray-500">Sets</label>
                        <input type="number" value={ex.sets} onChange={(e) => updateExercise(ex.tempId, "sets", e.target.value)} placeholder="3" className="input mt-0.5" data-ex-sets={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-reps="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reps</label>
                        <input type="text" value={ex.reps} onChange={(e) => updateExercise(ex.tempId, "reps", e.target.value)} placeholder="8-12" className="input mt-0.5" data-ex-reps={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-weight="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Weight</label>
                        <input type="text" value={ex.weight} onChange={(e) => updateExercise(ex.tempId, "weight", e.target.value)} placeholder="—" className="input mt-0.5" data-ex-weight={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-rest="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Rest (sec)</label>
                        <input type="number" value={ex.restSeconds} onChange={(e) => updateExercise(ex.tempId, "restSeconds", e.target.value)} placeholder="60" className="input mt-0.5" data-ex-rest={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }}} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Notes</label>
                      <input type="text" value={ex.notes} onChange={(e) => updateExercise(ex.tempId, "notes", e.target.value)} placeholder="Form cues, variations..." className="input mt-0.5" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Video URL (YouTube)</label>
                      <input type="url" value={ex.videoUrl} onChange={(e) => updateExercise(ex.tempId, "videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="input mt-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div data-exercise-end />
          <button
            type="button"
            onClick={addExercise}
            className="btn-secondary mt-3 w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise Manually
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving..." : "Create Workout Plan"}
          </button>
          <Link href="/dashboard/workouts" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
