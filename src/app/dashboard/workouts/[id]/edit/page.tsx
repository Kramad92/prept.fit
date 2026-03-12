"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePicker } from "@/components/client/exercise-picker";
import { ExerciseNameInput } from "@/components/client/exercise-name-input";
import { Textarea } from "@/components/ui/textarea";
import { AIGenerateWorkout } from "@/components/ai/ai-generate-workout";
import type { ExerciseInput } from "@/types";
import { createEmptyExercise } from "@/lib/utils";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";

export default function EditWorkoutPage() {
  const t = useT();
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
      .catch(() => {
        toast.error(t.workouts.failedToLoad);
        router.push("/dashboard/workouts");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

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

  function updateExercise(tempId: string, field: keyof ExerciseInput, value: string) {
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

    try {
      const res = await fetch(`/api/workouts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push(`/dashboard/workouts/${params.id}`);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || t.workouts.failedToSave);
      }
    } catch {
      toast.error(t.workouts.failedToSave);
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
          {t.workouts.backToPlan}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t.workouts.editWorkoutPlan}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card max-w-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.workouts.planName} *
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (document.querySelector("textarea") as HTMLTextAreaElement)?.focus();
                }
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.description}
            </label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder={t.workouts.aiPromptPlaceholder}
            />
            <div className="mt-1.5">
              <AIGenerateWorkout
                prompt={description}
                onGenerate={(data) => {
                  if (!name) setName(data.name);
                  setDescription(data.description || description);
                  setExercises(data.exercises);
                }}
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isTemplate}
              onChange={(e) => setIsTemplate(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-gray-700">
              {t.workouts.saveAsTemplate}
            </span>
          </label>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t.workouts.exercises}</h2>

          {/* Library Picker */}
          <div className="mt-3 max-w-lg">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t.workouts.addFromLibrary}
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
                        className="flex-1"
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
                        <label className="text-xs text-gray-500">{t.workouts.sets}</label>
                        <Input type="number" value={ex.sets} onChange={(e) => updateExercise(ex.tempId, "sets", e.target.value)} placeholder="3" className="mt-0.5" data-ex-sets={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-reps="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">{t.workouts.reps}</label>
                        <Input type="text" value={ex.reps} onChange={(e) => updateExercise(ex.tempId, "reps", e.target.value)} placeholder="8-12" className="mt-0.5" data-ex-reps={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-weight="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">{t.workouts.weight}</label>
                        <Input type="text" value={ex.weight} onChange={(e) => updateExercise(ex.tempId, "weight", e.target.value)} placeholder="—" className="mt-0.5" data-ex-weight={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (document.querySelector(`[data-ex-rest="${ex.tempId}"]`) as HTMLInputElement)?.focus(); }}} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">{t.workouts.restSec}</label>
                        <Input type="number" value={ex.restSeconds} onChange={(e) => updateExercise(ex.tempId, "restSeconds", e.target.value)} placeholder="60" className="mt-0.5" data-ex-rest={ex.tempId} onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }}} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">{t.common.notes}</label>
                      <Input type="text" value={ex.notes} onChange={(e) => updateExercise(ex.tempId, "notes", e.target.value)} placeholder={t.workouts.formCues} className="mt-0.5" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">{t.workouts.videoUrl}</label>
                      <Input type="url" value={ex.videoUrl} onChange={(e) => updateExercise(ex.tempId, "videoUrl", e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-0.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div data-exercise-end />
          <Button type="button" variant="outline" onClick={addExercise} className="mt-3 w-full">
            <Plus className="mr-2 h-4 w-4" />
            {t.workouts.addManually}
          </Button>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t.common.saving : t.workouts.saveChanges}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/workouts/${params.id}`}>
              {t.common.cancel}
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
