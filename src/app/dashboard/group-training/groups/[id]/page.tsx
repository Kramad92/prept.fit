"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Users, Calendar, Plus, X, Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionCard } from "@/components/group-training/session-card";
import type { TrainingGroupDetail, GroupSession } from "@/types";

interface ClientOption {
  id: string;
  name: string;
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const { data: group, loading, refresh } = useApi<TrainingGroupDetail>(`/api/training-groups/${id}`);
  const { data: clients } = useApi<ClientOption[]>(showAddMembers ? "/api/clients" : null);

  const existingIds = new Set(group?.members.map((m) => m.client.id) || []);
  const availableClients = (clients || []).filter((c) => !existingIds.has(c.id));

  const handleAddMembers = async () => {
    if (!selectedClients.length) return;
    await api.post(`/api/training-groups/${id}/members`, { clientIds: selectedClients });
    setSelectedClients([]);
    setShowAddMembers(false);
    refresh();
  };

  const handleRemoveMember = async (clientId: string) => {
    await api.delete(`/api/training-groups/${id}/members/${clientId}`);
    refresh();
  };

  const handleDelete = async () => {
    if (!confirm(t.common.delete + "?")) return;
    await api.delete(`/api/training-groups/${id}`);
    router.push("/dashboard/group-training");
  };

  if (loading || !group) return <PageSkeleton />;

  return (
    <div>
      <Link href="/dashboard/group-training" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" />
        {t.common.back}
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          {group.description && <p className="mt-1 text-sm text-gray-500">{group.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span>{group._count?.members}/{group.maxParticipants} {t.groupTraining.members.toLowerCase()}</span>
            <span>{group._count?.sessions} {t.groupTraining.sessions.toLowerCase()}</span>
          </div>
        </div>
        <button onClick={handleDelete} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Members */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            <Users className="mr-2 inline-block h-5 w-5" />
            {t.groupTraining.members} ({group._count?.members})
          </h2>
          <button onClick={() => setShowAddMembers(true)} className="btn-primary flex items-center gap-1 text-sm">
            <Plus className="h-4 w-4" />
            {t.groupTraining.addMembers}
          </button>
        </div>

        {showAddMembers && (
          <div className="card mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">{t.groupTraining.selectClients}</label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-gray-200 p-2">
              {availableClients.length === 0 ? (
                <p className="py-2 text-center text-sm text-gray-400">{t.common.noResults}</p>
              ) : (
                availableClients.map((client) => (
                  <label key={client.id} className="flex items-center gap-2 rounded p-1 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={(e) =>
                        setSelectedClients(e.target.checked
                          ? [...selectedClients, client.id]
                          : selectedClients.filter((cid) => cid !== client.id)
                        )
                      }
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{client.name}</span>
                  </label>
                ))
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleAddMembers} className="btn-primary text-sm">{t.common.add}</button>
              <button onClick={() => { setShowAddMembers(false); setSelectedClients([]); }} className="btn-secondary text-sm">{t.common.cancel}</button>
            </div>
          </div>
        )}

        {group.members.length === 0 ? (
          <EmptyState icon={Users} title={t.common.noResults} description={t.groupTraining.addMembers} />
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            {group.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/dashboard/clients/${member.client.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                    {member.client.name}
                  </Link>
                  {member.client.email && <p className="text-xs text-gray-400">{member.client.email}</p>}
                </div>
                <button
                  onClick={() => handleRemoveMember(member.client.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  title={t.groupTraining.removeMember}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sessions */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          <Calendar className="mr-2 inline-block h-5 w-5" />
          {t.groupTraining.sessions}
        </h2>

        {group.sessions.length === 0 ? (
          <EmptyState icon={Calendar} title={t.groupTraining.noSessions} description={t.groupTraining.noSessionsDesc} />
        ) : (
          <div className="space-y-2">
            {(group.sessions as GroupSession[]).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                href={`/dashboard/group-training/sessions/${session.id}`}
                participantLabel={t.groupTraining.participants.toLowerCase()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
