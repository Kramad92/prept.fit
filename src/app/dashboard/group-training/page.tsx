"use client";

import { useState } from "react";
import Link from "next/link";
import { UsersRound, Calendar, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionCard } from "@/components/group-training/session-card";
import { NewSessionForm } from "@/components/group-training/new-session-form";
import type { TrainingGroup, GroupSession } from "@/types";

export default function GroupTrainingPage() {
  const t = useT();
  const [tab, setTab] = useState<"groups" | "sessions">("groups");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", maxParticipants: "20" });

  const { data: groups, loading: groupsLoading, refresh: refreshGroups } = useApi<TrainingGroup[]>("/api/training-groups");
  const { data: sessions, loading: sessionsLoading, refresh: refreshSessions } = useApi<GroupSession[]>("/api/group-sessions");

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;
    await api.post("/api/training-groups", {
      name: newGroup.name.trim(),
      description: newGroup.description.trim() || null,
      maxParticipants: parseInt(newGroup.maxParticipants) || 20,
    });
    setNewGroup({ name: "", description: "", maxParticipants: "20" });
    setShowNewGroup(false);
    refreshGroups();
  };

  if (groupsLoading || sessionsLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.groupTraining.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.groupTraining.subtitle}</p>
        </div>
        <Button
          onClick={() => tab === "groups" ? setShowNewGroup(true) : setShowNewSession(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {tab === "groups" ? t.groupTraining.newGroup : t.groupTraining.newSession}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {(["groups", "sessions"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === t2 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t2 === "groups" ? <UsersRound className="mr-2 inline-block h-4 w-4" /> : <Calendar className="mr-2 inline-block h-4 w-4" />}
            {t2 === "groups" ? t.groupTraining.groups : t.groupTraining.sessions}
          </button>
        ))}
      </div>

      {/* New Group form */}
      {showNewGroup && (
        <div className="card mb-6">
          <h3 className="mb-4 text-lg font-semibold">{t.groupTraining.newGroup}</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.groupName}</label>
              <Input type="text" placeholder={t.groupTraining.groupNamePlaceholder} value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.common.description}</label>
              <Textarea rows={2} value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t.groupTraining.maxParticipants}</label>
              <Input type="number" className="w-32" value={newGroup.maxParticipants} onChange={(e) => setNewGroup({ ...newGroup, maxParticipants: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateGroup}>{t.common.create}</Button>
              <Button variant="outline" onClick={() => setShowNewGroup(false)}>{t.common.cancel}</Button>
            </div>
          </div>
        </div>
      )}

      {/* New Session form */}
      {showNewSession && (
        <NewSessionForm
          groups={groups || []}
          onCreated={() => { setShowNewSession(false); refreshSessions(); }}
          onCancel={() => setShowNewSession(false)}
        />
      )}

      {/* Groups Tab */}
      {tab === "groups" && (
        !groups?.length ? (
          <EmptyState icon={UsersRound} title={t.groupTraining.noGroups} description={t.groupTraining.noGroupsDesc} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link key={group.id} href={`/dashboard/group-training/groups/${group.id}`} className="card transition-shadow hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                {group.description && <p className="mt-1 line-clamp-2 text-sm text-gray-500">{group.description}</p>}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group._count?.members} {t.groupTraining.members.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {group._count?.sessions} {t.groupTraining.sessions.toLowerCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {/* Sessions Tab */}
      {tab === "sessions" && (
        !sessions?.length ? (
          <EmptyState icon={Calendar} title={t.groupTraining.noSessions} description={t.groupTraining.noSessionsDesc} />
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                href={`/dashboard/group-training/sessions/${session.id}`}
                participantLabel={t.groupTraining.participants.toLowerCase()}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
