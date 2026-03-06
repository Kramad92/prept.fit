"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Play, Youtube } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  videoUrl: string | null;
  orderIndex: number;
}

interface LogEntry {
  exerciseId: string;
  setNumber: number;
  repsCompleted: string;
  weightUsed: string;
  completed: boolean;
}

export default function WorkoutLogPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [planName, setPlanName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<Record<string, LogEntry[]>>({});
  const [notes, setNotes] = useState("");
  const [startTime] = useState(Date.now());
  const [showVideo, setShowVideo] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((data) => {
        const plan = data.assignedPlans?.find(
          (p: any) => p.workoutPlan.id === params.planId
        );
        if (plan) {
          setPlanName(plan.customName || plan.workoutPlan.name);
          // Use client exercises if available, else fall back to template exercises
          const exs = plan.clientExercises?.length > 0
            ? plan.clientExercises
            : plan.workoutPlan.exercises;
          setExercises(exs);

          // Pre-populate entries from prescribed sets
          const initialEntries: Record<string, LogEntry[]> = {};
          for (const ex of exs) {
            const numSets = ex.sets || 1;
            initialEntries[ex.id] = Array.from({ length: numSets }, (_, i) => ({
              exerciseId: ex.id,
              setNumber: i + 1,
              repsCompleted: ex.reps || "",
              weightUsed: ex.weight || "",
              completed: false,
            }));
          }
          setEntries(initialEntries);
        }
      })
      .finally(() => setLoading(false));
  }, [params.planId]);

  function updateEntry(
    exerciseId: string,
    setIndex: number,
    field: keyof LogEntry,
    value: any
  ) {
    setEntries((prev) => ({
      ...prev,
      [exerciseId]: prev[exerciseId].map((e, i) =>
        i === setIndex ? { ...e, [field]: value } : e
      ),
    }));
  }

  function getYouTubeId(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  }

  async function handleFinish() {
    setSaving(true);
    const duration = Math.round((Date.now() - startTime) / 60000);

    const allEntries = Object.values(entries)
      .flat()
      .filter((e) => e.completed);

    await fetch("/api/workout-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutPlanId: params.planId,
        completed: true,
        duration,
        notes,
        entries: allEntries.map((e) => ({
          exerciseId: e.exerciseId,
          setNumber: e.setNumber,
          repsCompleted: e.repsCompleted ? parseInt(e.repsCompleted) : null,
          weightUsed: e.weightUsed || null,
          completed: e.completed,
        })),
      }),
    });

    router.push("/portal/workouts");
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
      <Link
        href="/portal/workouts"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.workoutLog.backToWorkouts}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{planName}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            <Play className="mr-1 inline h-3.5 w-3.5" />
            {t.workoutLog.inProgress}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {exercises.map((ex, exIdx) => (
          <div key={ex.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {exIdx + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">{ex.name}</h3>
                  <p className="text-xs text-gray-500">
                    {ex.sets && `${ex.sets} ${t.portalWorkouts.sets}`}
                    {ex.reps && ` x ${ex.reps}`}
                    {ex.weight && ` @ ${ex.weight}`}
                    {ex.restSeconds && ` | ${ex.restSeconds}s ${t.portalWorkouts.rest}`}
                  </p>
                </div>
              </div>
              {ex.videoUrl && (
                <button
                  onClick={() =>
                    setShowVideo(showVideo === ex.id ? null : ex.id)
                  }
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Youtube className="h-5 w-5" />
                </button>
              )}
            </div>

            {ex.notes && (
              <p className="mt-2 text-xs italic text-gray-400">{ex.notes}</p>
            )}

            {/* Video Embed */}
            {showVideo === ex.id && ex.videoUrl && (
              <div className="mt-3 aspect-video overflow-hidden rounded-lg">
                {getYouTubeId(ex.videoUrl) ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(ex.videoUrl)}`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={ex.videoUrl} controls className="h-full w-full" />
                )}
              </div>
            )}

            {/* Set Logging */}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 text-xs font-medium text-gray-500">
                <span>{t.workoutLog.set}</span>
                <span>{t.workoutLog.reps}</span>
                <span>{t.workoutLog.weight}</span>
                <span></span>
              </div>
              {(entries[ex.id] || []).map((entry, setIdx) => (
                <div
                  key={setIdx}
                  className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2"
                >
                  <span className="text-sm font-medium text-gray-500">
                    {setIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={entry.repsCompleted}
                    onChange={(e) =>
                      updateEntry(ex.id, setIdx, "repsCompleted", e.target.value)
                    }
                    placeholder={ex.reps || "—"}
                    className="input py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={entry.weightUsed}
                    onChange={(e) =>
                      updateEntry(ex.id, setIdx, "weightUsed", e.target.value)
                    }
                    placeholder={ex.weight || "—"}
                    className="input py-2 text-sm"
                  />
                  <button
                    onClick={() =>
                      updateEntry(ex.id, setIdx, "completed", !entry.completed)
                    }
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                      entry.completed
                        ? "bg-brand-600 text-white"
                        : "border border-gray-200 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {entry.completed && <Check className="h-5 w-5" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Notes & Finish */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700">
            {t.workoutLog.workoutNotes}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input mt-1"
            placeholder={t.workoutLog.howDidItFeel}
          />
        </div>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="btn-primary w-full py-3 text-base"
        >
          {saving ? t.common.saving : t.workoutLog.finishWorkout}
        </button>
      </div>
    </div>
  );
}
