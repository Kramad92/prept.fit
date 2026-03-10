"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarRange,
  Dumbbell,
  Pencil,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { WorkoutProgramDetail } from "@/types";

interface ClientOption {
  id: string;
  name: string;
}

export default function ProgramDetailPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [program, setProgram] = useState<WorkoutProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [accessPolicy, setAccessPolicy] = useState("date_range");
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<WorkoutProgramDetail>(`/api/programs/${params.id}`),
      api.get<ClientOption[]>("/api/clients"),
    ])
      .then(([p, c]) => {
        setProgram(p);
        setClients(c);
      })
      .catch(() => router.push("/dashboard/programs"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleAssign() {
    if (!assignClientId || !startDate) return;
    setAssigning(true);
    try {
      await api.post("/api/programs/assign", {
        clientId: assignClientId,
        programId: params.id,
        startDate,
        accessPolicy,
      });
      const updated = await api.get<WorkoutProgramDetail>(
        `/api/programs/${params.id}`
      );
      setProgram(updated);
      setShowAssign(false);
      setAssignClientId("");
    } catch {
      // handled by api client
    }
    setAssigning(false);
  }

  async function handleDelete() {
    if (!confirm(t.programs.deleteConfirm)) return;
    setDeleting(true);
    try {
      await api.delete(`/api/programs/${params.id}`);
      router.push("/dashboard/programs");
    } catch {
      setDeleting(false);
    }
  }

  if (loading || !program) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // Group days by week
  const weekGroups: Record<number, typeof program.days> = {};
  for (const d of program.days) {
    if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
    weekGroups[d.weekNumber].push(d);
  }

  const assignedClientIds = new Set(
    program.assignments.map((a) => a.client.id)
  );
  const availableClients = clients.filter(
    (c) => !assignedClientIds.has(c.id)
  );

  return (
    <div>
      <Link
        href="/dashboard/programs"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.programs.backToPrograms}
      </Link>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
        </div>
        {program.description && (
          <p className="mt-1 text-sm text-gray-500">{program.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
          <span>
            {program.durationWeeks} {t.programs.weeks}
          </span>
          <span>
            {program.daysPerWeek} {t.programs.daysWeek}
          </span>
          <span>
            {program.days.length} {t.programs.workoutsCount}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/dashboard/programs/${program.id}/edit`}
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
            {t.programs.assignToClient}
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

      {/* Week/Day Schedule */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          {t.programs.schedule}
        </h2>
        {Object.keys(weekGroups).length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            {t.programs.noWorkoutsAdded}
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {Object.entries(weekGroups).map(([weekStr, weekDays]) => (
              <div key={weekStr}>
                <h3 className="text-sm font-semibold text-gray-700">
                  {t.programs.week} {weekStr}
                </h3>
                <div className="mt-2 space-y-2">
                  {weekDays.map((day) => (
                    <div
                      key={day.id}
                      className="card flex items-center gap-3 !py-3"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                        {day.dayNumber}
                      </span>
                      {day.label && (
                        <span className="text-sm font-medium text-gray-600">
                          {day.label}
                        </span>
                      )}
                      {day.workoutPlan ? (
                        <Link
                          href={`/dashboard/workouts/${day.workoutPlan.id}`}
                          className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
                        >
                          <Dumbbell className="h-4 w-4" />
                          {day.workoutPlan.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">
                          {t.programs.restDay}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Clients */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.programs.assignedClients} ({program.assignments.length})
          </h2>
        </div>
        {program.assignments.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center py-8 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {t.programs.notAssigned}
            </p>
            <button
              onClick={() => setShowAssign(true)}
              className="btn-primary mt-4"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t.programs.assignToClient}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {program.assignments.map((a) => (
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
                  <p className="text-xs text-gray-500">
                    {t.programs.week} {a.currentWeek} &middot;{" "}
                    {t.programs.startedOn}{" "}
                    {new Date(a.startDate).toLocaleDateString()}
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
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t.programs.assignProgram}
              </h2>
              <button
                onClick={() => setShowAssign(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">{t.programs.client}</label>
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
                <label className="label">{t.programs.startDate}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">{t.programs.accessPolicy}</label>
                <select
                  value={accessPolicy}
                  onChange={(e) => setAccessPolicy(e.target.value)}
                  className="input"
                >
                  <option value="date_range">{t.programs.dateRange}</option>
                  <option value="unlimited">{t.programs.unlimited}</option>
                  <option value="subscription_tied">
                    {t.programs.subscriptionTied}
                  </option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {accessPolicy === "date_range" && t.programs.dateRangeDesc}
                  {accessPolicy === "unlimited" && t.programs.unlimitedDesc}
                  {accessPolicy === "subscription_tied" &&
                    t.programs.subscriptionTiedDesc}
                </p>
              </div>
              <button
                onClick={handleAssign}
                disabled={!assignClientId || !startDate || assigning}
                className="btn-primary w-full"
              >
                {assigning ? t.common.saving : t.programs.assignProgram}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
