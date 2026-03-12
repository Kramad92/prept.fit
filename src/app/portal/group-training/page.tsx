"use client";

import { UsersRound, Calendar, MapPin, Dumbbell } from "lucide-react";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

interface PortalGroup {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  joinedAt: string;
  nextSession: { date: string; startTime: string } | null;
}

interface EnrolledSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  maxParticipants: number;
  group: { id: string; name: string } | null;
  workoutPlan: { id: string; name: string } | null;
  _count: { participants: number };
  participants: Array<{
    status: string;
    clientWorkoutPlanId: string | null;
  }>;
}

interface OpenSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  maxParticipants: number;
  group: { id: string; name: string } | null;
  _count: { participants: number };
}

export default function PortalGroupTrainingPage() {
  const t = useT();
  const { locale } = useLocale();

  const { data: groups, loading: groupsLoading } = useApi<PortalGroup[]>("/api/portal/training-groups");
  const { data: sessionsData, loading: sessionsLoading, refresh } = useApi<{
    enrolled: EnrolledSession[];
    open: OpenSession[];
  }>("/api/portal/group-sessions");

  const enrolled = sessionsData?.enrolled || [];
  const open = sessionsData?.open || [];

  const handleSignUp = async (sessionId: string) => {
    await api.post(`/api/portal/group-sessions/${sessionId}/enroll`);
    refresh();
  };

  const handleCancel = async (sessionId: string) => {
    await api.delete(`/api/portal/group-sessions/${sessionId}/enroll`);
    refresh();
  };

  if (groupsLoading || sessionsLoading) return <PageSkeleton />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.groupTraining.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.groupTraining.subtitle}</p>
      </div>

      {/* My Groups */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          <UsersRound className="mr-2 inline-block h-5 w-5" />
          {t.groupTraining.myGroups}
        </h2>
        {!groups?.length ? (
          <EmptyState icon={UsersRound} title={t.groupTraining.myGroups} description={t.groupTraining.noGroupMemberships} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group.id} className="card">
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                {group.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-gray-500">{group.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                  <span>{group.memberCount} {t.groupTraining.members.toLowerCase()}</span>
                  {group.nextSession && (
                    <span className="text-brand-600">
                      {t.groupTraining.nextSession}:{" "}
                      {new Date(group.nextSession.date).toLocaleDateString(getDateLocale(locale), {
                        month: "short", day: "numeric",
                      })}{" "}
                      {group.nextSession.startTime}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Enrolled Sessions */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          <Calendar className="mr-2 inline-block h-5 w-5" />
          {t.groupTraining.upcomingSessions}
        </h2>
        {enrolled.length === 0 ? (
          <EmptyState icon={Calendar} title={t.groupTraining.upcomingSessions} description={t.groupTraining.noUpcomingSessions} />
        ) : (
          <div className="space-y-3">
            {enrolled.map((session) => (
              <div key={session.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>
                        {new Date(session.date).toLocaleDateString(getDateLocale(locale), {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                        {" "}{session.startTime}–{session.endTime}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{session.location}
                        </span>
                      )}
                      {session.group && (
                        <span className="text-brand-600">{session.group.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.workoutPlan && (
                      <span className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                        <Dumbbell className="h-3 w-3" />
                        {session.workoutPlan.name}
                      </span>
                    )}
                    <button
                      onClick={() => handleCancel(session.id)}
                      className="rounded-lg px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      {t.groupTraining.cancelEnrollment}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Open Sessions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          <Calendar className="mr-2 inline-block h-5 w-5" />
          {t.groupTraining.openSessions}
        </h2>
        {open.length === 0 ? (
          <EmptyState icon={Calendar} title={t.groupTraining.openSessions} description={t.groupTraining.noOpenSessions} />
        ) : (
          <div className="space-y-3">
            {open.map((session) => {
              const spotsLeft = session.maxParticipants - session._count.participants;
              const isFull = spotsLeft <= 0;
              return (
                <div key={session.id} className="card flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span>
                        {new Date(session.date).toLocaleDateString(getDateLocale(locale), {
                          weekday: "short", month: "short", day: "numeric",
                        })}
                        {" "}{session.startTime}–{session.endTime}
                      </span>
                      {session.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{session.location}
                        </span>
                      )}
                      {session.group && (
                        <span className="text-brand-600">{session.group.name}</span>
                      )}
                      <span className={isFull ? "font-medium text-red-600" : "text-gray-500"}>
                        {isFull ? t.groupTraining.full : `${spotsLeft} ${t.groupTraining.spotsLeft}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSignUp(session.id)}
                    disabled={isFull}
                    className="text-sm"
                  >
                    {t.groupTraining.signUp}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
