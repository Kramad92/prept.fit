"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Dumbbell,
  Users,
  Play,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { ExpandableNotes } from "@/components/ui/expandable-notes";

interface Exercise {
  id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  weight: string | null;
  restSeconds: number | null;
  notes: string | null;
  orderIndex: number;
  videoUrl: string | null;
}

interface AssignedClient {
  id: string;
  client: { id: string; name: string; status: string };
  isActive: boolean;
}

interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  createdAt: string;
  exercises: Exercise[];
  assignedTo: AssignedClient[];
}

interface ClientOption {
  id: string;
  name: string;
}

export default function WorkoutDetailPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [assignAccessPolicy, setAssignAccessPolicy] = useState("unlimited");
  const [assignEndDate, setAssignEndDate] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/workouts/${params.id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setPlan(p);
        setClients(c);
      })
      .catch(() => router.push("/dashboard/workouts"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleDuplicate() {
    setDuplicating(true);
    const res = await fetch(`/api/workouts/${params.id}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/dashboard/workouts/${copy.id}`);
    }
    setDuplicating(false);
  }

  async function handleDelete() {
    if (!confirm(t.workouts.deleteConfirm)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/workouts/${params.id}`);
      router.push("/dashboard/workouts");
    } catch {
      setDeleting(false);
    }
  }

  async function handleAssign() {
    if (!assignClientId) return;
    await fetch("/api/workouts/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutPlanId: params.id,
        clientId: assignClientId,
        accessPolicy: assignAccessPolicy,
        endDate: assignAccessPolicy === "date_range" && assignEndDate ? assignEndDate : null,
      }),
    });
    // Reload plan to update assigned list
    const updated = await fetch(`/api/workouts/${params.id}`).then((r) =>
      r.json()
    );
    setPlan(updated);
    setShowAssign(false);
    setAssignClientId("");
    setAssignAccessPolicy("unlimited");
    setAssignEndDate("");
  }

  if (loading || !plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  function getYouTubeId(url: string): string | null {
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/
    );
    return match ? match[1] : null;
  }

  // Clients not already assigned
  const assignedIds = new Set(plan.assignedTo.map((a) => a.client.id));
  const availableClients = clients.filter((c) => !assignedIds.has(c.id));

  return (
    <div>
      <Link
        href="/dashboard/workouts"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.workouts.backToWorkouts}
      </Link>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
          {plan.isTemplate && (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {t.workouts.template}
            </span>
          )}
        </div>
        {plan.description && (
          <ExpandableNotes notes={plan.description} className="mt-1 text-sm text-gray-500" />
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleDuplicate}
            disabled={duplicating}
            className="btn-secondary text-sm"
            title={t.workouts.duplicate}
          >
            <Copy className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{duplicating ? t.workouts.duplicating : t.workouts.duplicate}</span>
            <span className="sm:hidden">{duplicating ? "..." : t.workouts.copy}</span>
          </button>
          <Link
            href={`/dashboard/workouts/${plan.id}/edit`}
            className="btn-secondary text-sm"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            {t.common.edit}
          </Link>
          <button
            onClick={() => setShowAssign(true)}
            className="btn-primary text-sm"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {t.workouts.assign}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn-secondary text-sm !text-red-600 hover:!bg-red-50"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t.common.delete}
          </button>
        </div>
      </div>

      {/* Exercises */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          {t.workouts.exercises} ({plan.exercises.length})
        </h2>
        <div className="mt-4 space-y-3">
          {plan.exercises.map((ex, i) => (
            <div key={ex.id} className="card">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
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
                    <ExpandableNotes notes={ex.notes} />
                  )}
                  {ex.videoUrl && (
                    <div className="mt-3">
                      {getYouTubeId(ex.videoUrl) ? (
                        <div className="aspect-video max-w-md overflow-hidden rounded-lg">
                          <iframe
                            src={`https://www.youtube.com/embed/${getYouTubeId(ex.videoUrl)}`}
                            className="h-full w-full"
                            allowFullScreen
                            title={`${ex.name} demo`}
                          />
                        </div>
                      ) : (
                        <a
                          href={ex.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                        >
                          <Play className="h-3.5 w-3.5" />
                          {t.workouts.watchDemo}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Clients */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.workouts.assignedClients} ({plan.assignedTo.length})
          </h2>
          {availableClients.length > 0 && (
            <button
              onClick={() => setShowAssign(true)}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {t.workouts.assignClient}
            </button>
          )}
        </div>
        {plan.assignedTo.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center py-8 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {t.workouts.notAssigned}
            </p>
            {availableClients.length > 0 && (
              <button
                onClick={() => setShowAssign(true)}
                className="btn-primary mt-4"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t.workouts.assignToClient}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {plan.assignedTo.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/clients/${a.client.id}`}
                className="card flex items-center gap-3 transition-shadow hover:shadow-md"
              >
                <Avatar name={a.client.name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {a.client.name}
                  </p>
                </div>
                <StatusBadge status={a.isActive ? "active" : "inactive"} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.workouts.assignToClient}</h2>
              <button
                onClick={() => setShowAssign(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <select
                  value={assignClientId}
                  onChange={(e) => setAssignClientId(e.target.value)}
                  className="input"
                >
                  <option value="">{t.workouts.selectClient}</option>
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">{t.programs.accessPolicy}</label>
                <select
                  value={assignAccessPolicy}
                  onChange={(e) => setAssignAccessPolicy(e.target.value)}
                  className="input"
                >
                  <option value="unlimited">{t.programs.unlimited}</option>
                  <option value="date_range">{t.programs.dateRange}</option>
                  <option value="subscription_tied">{t.programs.subscriptionTied}</option>
                </select>
              </div>
              {assignAccessPolicy === "date_range" && (
                <div>
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    value={assignEndDate}
                    onChange={(e) => setAssignEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              )}
              <button
                onClick={handleAssign}
                disabled={!assignClientId}
                className="btn-primary w-full"
              >
                {t.workouts.assignPlan}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
