"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  async function confirmDelete() {
    setDeleteLoading(true);
    setDeleting(true);
    try {
      await api.delete(`/api/workouts/${params.id}`);
    } catch (err: any) {
      if (err?.status !== 404) {
        toast.error(err?.message || t.errors.somethingWentWrong);
        setDeleteLoading(false);
        setDeleting(false);
        return;
      }
    }
    router.push("/dashboard/workouts");
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
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="text-sm"
            title={t.workouts.duplicate}
          >
            <Copy className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{duplicating ? t.workouts.duplicating : t.workouts.duplicate}</span>
            <span className="sm:hidden">{duplicating ? "..." : t.workouts.copy}</span>
          </Button>
          <Button variant="outline" asChild className="text-sm">
            <Link href={`/dashboard/workouts/${plan.id}/edit`}>
              <Pencil className="mr-1.5 h-4 w-4" />
              {t.common.edit}
            </Link>
          </Button>
          <Button
            onClick={() => setShowAssign(true)}
            className="text-sm"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {t.workouts.assign}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="text-sm !text-red-600 hover:!bg-red-50"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t.common.delete}
          </Button>
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
              <Button
                onClick={() => setShowAssign(true)}
                className="mt-4"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t.workouts.assignToClient}
              </Button>
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={t.workouts.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={deleteLoading}
        destructive
      />

      {/* Assign Modal */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.workouts.assignToClient}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div>
              <FilterSelect
                value={assignClientId}
                onChange={setAssignClientId}
                placeholder={t.workouts.selectClient}
                options={availableClients.map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <label className="label">{t.programs.accessPolicy}</label>
              <FilterSelect
                value={assignAccessPolicy}
                onChange={setAssignAccessPolicy}
                placeholder={t.programs.accessPolicy}
                options={[
                  { value: "unlimited", label: t.programs.unlimited },
                  { value: "date_range", label: t.programs.dateRange },
                  { value: "subscription_tied", label: t.programs.subscriptionTied },
                ]}
              />
            </div>
            {assignAccessPolicy === "date_range" && (
              <div>
                <label className="label">End Date</label>
                <Input
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                />
              </div>
            )}
            <Button
              onClick={handleAssign}
              disabled={!assignClientId}
              className="w-full"
            >
              {t.workouts.assignPlan}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
