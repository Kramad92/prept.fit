"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, GripVertical, Trash2 } from "lucide-react";

interface ExerciseInput {
  tempId: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  restSeconds: string;
  notes: string;
  videoUrl: string;
}

function createEmptyExercise(): ExerciseInput {
  return {
    tempId: Math.random().toString(36).slice(2),
    name: "",
    sets: "",
    reps: "",
    weight: "",
    restSeconds: "",
    notes: "",
    videoUrl: "",
  };
}

export default function EditWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [exercises, setExercises] = useState<ExerciseInput[]>([]);

  useEffect(() => {
    fetch(`/api/workouts/${params.id}`)
      .then((r) => r.json())
      .then((plan) => {
        setName(plan.name);
        setDescription(plan.description || "");
        setIsTemplate(plan.isTemplate);
        setExercises(
          plan.exercises.map((ex: any) => ({
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
      })
      .catch(() => router.push("/dashboard/workouts"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  function addExercise() {
    setExercises((prev) => [...prev, createEmptyExercise()]);
  }

  function removeExercise(tempId: string) {
    setExercises((prev) => prev.filter((e) => e.tempId !== tempId));
  }

  function updateExercise(tempId: string, field: keyof ExerciseInput, value: string) {
    setExercises((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const data = {
      name,
      description: description || null,
      isTemplate,
      exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name,
          sets: ex.sets || null,
          reps: ex.reps || null,
          weight: ex.weight || null,
          restSeconds: ex.restSeconds || null,
          notes: ex.notes || null,
          videoUrl: ex.videoUrl || null,
        })),
    };

    const res = await fetch(`/api/workouts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push(`/dashboard/workouts/${params.id}`);
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/dashboard/workouts/${params.id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plan
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Edit Workout Plan
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
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input mt-1"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              Save as reusable template
            </span>
          </label>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exercises</h2>
          <div className="mt-3 space-y-3">
            {exercises.map((ex, index) => (
              <div key={ex.tempId} className="card">
                <div className="flex items-start gap-2">
                  <GripVertical className="mt-2 h-5 w-5 flex-shrink-0 text-gray-300" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {index + 1}
                      </span>
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => updateExercise(ex.tempId, "name", e.target.value)}
                        placeholder="Exercise name"
                        className="input flex-1"
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
                        <input type="number" value={ex.sets} onChange={(e) => updateExercise(ex.tempId, "sets", e.target.value)} placeholder="3" className="input mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Reps</label>
                        <input type="text" value={ex.reps} onChange={(e) => updateExercise(ex.tempId, "reps", e.target.value)} placeholder="8-12" className="input mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Weight</label>
                        <input type="text" value={ex.weight} onChange={(e) => updateExercise(ex.tempId, "weight", e.target.value)} placeholder="135lbs" className="input mt-0.5" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Rest (sec)</label>
                        <input type="number" value={ex.restSeconds} onChange={(e) => updateExercise(ex.tempId, "restSeconds", e.target.value)} placeholder="60" className="input mt-0.5" />
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

          <button type="button" onClick={addExercise} className="btn-secondary mt-3 w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Exercise
          </button>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <Link href={`/dashboard/workouts/${params.id}`} className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
