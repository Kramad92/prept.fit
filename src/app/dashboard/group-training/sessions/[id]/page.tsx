"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MapPin, Dumbbell, CheckCircle2, Users, Plus, X, Trash2 } from "lucide-react";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GroupSessionDetail, ClientOption } from "@/types";

interface WorkoutTemplate {
  id: string;
  name: string;
  isTemplate: boolean;
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();
  const [showEnroll, setShowEnroll] = useState(false);
  const [showAssignWorkout, setShowAssignWorkout] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});

  const { data: session, loading, refresh } = useApi<GroupSessionDetail>(`/api/group-sessions/${id}`);
  const { data: clients } = useApi<ClientOption[]>(showEnroll ? "/api/clients" : null);
  const { data: templates } = useApi<WorkoutTemplate[]>(showAssignWorkout ? "/api/workouts" : null);

  const enrolledIds = new Set(session?.participants.map((p) => p.client.id) || []);
  const availableClients = (clients || []).filter((c) => !enrolledIds.has(c.id));

  const handleEnroll = async (clientId: string) => {
    await api.post(`/api/group-sessions/${id}/enroll`, { clientId });
    setShowEnroll(false);
    refresh();
  };

  const handleRemoveEnrollment = async (clientId: string) => {
    await api.delete(`/api/group-sessions/${id}/enroll?clientId=${clientId}`);
    refresh();
  };

  const handleAssignWorkout = async () => {
    if (!selectedWorkout) return;
    await api.post(`/api/group-sessions/${id}/workout`, { workoutPlanId: selectedWorkout });
    setShowAssignWorkout(false);
    setSelectedWorkout("");
    refresh();
  };

  const handleSaveAttendance = async () => {
    if (!session) return;
    const participants = session.participants.map((p) => ({
      clientId: p.client.id,
      status: attendance[p.client.id] || p.status,
    }));
    await api.put(`/api/group-sessions/${id}/attendance`, { participants });
    refresh();
  };

  const handleMarkComplete = async () => {
    await api.put(`/api/group-sessions/${id}`, { status: "completed" });
    refresh();
  };

  const handleDelete = async () => {
    if (!confirm(t.common.delete + "?")) return;
    await api.delete(`/api/group-sessions/${id}`);
    router.push("/dashboard/group-training");
  };

  if (loading || !session) return <PageSkeleton />;

  return (
    <div>
      <Link
        href="/dashboard/group-training"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
            {session.isOpen && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Open</span>
            )}
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span>
              {new Date(session.date).toLocaleDateString(getDateLocale(locale), {
                weekday: "long", month: "long", day: "numeric",
              })}
            </span>
            <span>{session.startTime}–{session.endTime}</span>
            {session.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{session.location}
              </span>
            )}
            {session.group && (
              <Link href={`/dashboard/group-training/groups/${session.group.id}`} className="text-brand-600 hover:underline">
                {session.group.name}
              </Link>
            )}
          </div>
          {session.notes && <p className="mt-2 text-sm text-gray-500">{session.notes}</p>}
        </div>
        <button onClick={handleDelete} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Action buttons */}
      {session.status === "scheduled" && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => setShowEnroll(true)} className="btn-secondary flex items-center gap-1 text-sm">
            <Plus className="h-4 w-4" />{t.groupTraining.enrolled}
          </button>
          <button onClick={() => setShowAssignWorkout(true)} className="btn-secondary flex items-center gap-1 text-sm">
            <Dumbbell className="h-4 w-4" />{t.groupTraining.assignWorkout}
          </button>
          <button onClick={handleMarkComplete} className="btn-primary flex items-center gap-1 text-sm">
            <CheckCircle2 className="h-4 w-4" />{t.groupTraining.markComplete}
          </button>
        </div>
      )}

      {/* Workout plan badge */}
      {session.workoutPlan && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2">
          <Dumbbell className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">{session.workoutPlan.name}</span>
        </div>
      )}

      {/* Enroll client modal */}
      {showEnroll && (
        <div className="card mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">{t.groupTraining.selectClients}</h3>
            <button onClick={() => setShowEnroll(false)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {availableClients.length === 0 ? (
              <p className="py-2 text-center text-sm text-gray-400">{t.common.noResults}</p>
            ) : (
              availableClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleEnroll(client.id)}
                  className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
                >
                  {client.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Assign workout modal */}
      {showAssignWorkout && (
        <div className="card mb-4">
          <h3 className="mb-3 font-medium">{t.groupTraining.assignWorkout}</h3>
          <select
            className="input mb-3"
            value={selectedWorkout}
            onChange={(e) => setSelectedWorkout(e.target.value)}
          >
            <option value="">{t.groupTraining.selectWorkoutPlan}</option>
            {(templates || []).map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAssignWorkout} className="btn-primary text-sm">{t.workouts.assign}</button>
            <button onClick={() => setShowAssignWorkout(false)} className="btn-secondary text-sm">{t.common.cancel}</button>
          </div>
        </div>
      )}

      {/* Participants */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            <Users className="mr-2 inline-block h-5 w-5" />
            {t.groupTraining.participants} ({session._count?.participants}/{session.maxParticipants})
          </h2>
          {session.status === "scheduled" && session.participants.length > 0 && (
            <button onClick={handleSaveAttendance} className="btn-secondary text-sm">
              {t.groupTraining.markAttendance}
            </button>
          )}
        </div>

        {session.participants.length === 0 ? (
          <EmptyState icon={Users} title={t.common.noResults} description={t.groupTraining.selectClients} />
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {session.participants.map((p) => {
              const currentStatus = attendance[p.client.id] || p.status;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/clients/${p.client.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {p.client.name}
                    </Link>
                    <StatusBadge status={currentStatus} />
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === "scheduled" && (
                      <select
                        className="rounded border border-gray-200 px-2 py-1 text-xs"
                        value={currentStatus}
                        onChange={(e) => setAttendance({ ...attendance, [p.client.id]: e.target.value })}
                      >
                        <option value="enrolled">{t.groupTraining.enrolled}</option>
                        <option value="attended">{t.groupTraining.attended}</option>
                        <option value="no-show">{t.groupTraining.noShow}</option>
                        <option value="cancelled">{t.groupTraining.cancelled}</option>
                      </select>
                    )}
                    {session.status === "scheduled" && (
                      <button
                        onClick={() => handleRemoveEnrollment(p.client.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
