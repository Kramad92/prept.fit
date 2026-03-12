"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Calendar,
  Dumbbell,
  UtensilsCrossed,
  Clock,
  DollarSign,
  AlertTriangle,
  UserCheck,
  UserX,
  ChevronRight,
  MessageSquare,
  Cake,
  Plus,
  ClipboardCheck,
  Timer,
  Send,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";

// ─── Types ───

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  description: string | null;
  clientName: string;
  clientId: string;
}

interface ProfileItem {
  id: string;
  name: string;
  filled: number;
  total: number;
  hasPortalAccess: boolean;
}

interface UnreadClient {
  clientId: string;
  clientName: string;
  count: number;
  latest: string;
}

interface BirthdayItem {
  id: string;
  name: string;
  date: string;
  daysUntil: number;
  turningAge: number;
}

interface ExpiringPlan {
  id: string;
  clientName: string;
  clientId: string;
  planName: string;
  endDate: string | null;
}

interface ActivityItem {
  type: "payment" | "workout" | "checkin" | "message";
  text: string;
  detail: string | null;
  date: string;
}

interface CheckInItem {
  id: string;
  clientName: string;
  clientId: string;
  submittedAt: string;
}

interface DashboardData {
  clientCount: number;
  totalClients: number;
  weekSessions: number;
  planCount: number;
  mealPlanCount: number;
  todaySessions: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    clientName: string;
  }>;
  recentClients: Array<{
    id: string;
    name: string;
    status: string;
    goals: string | null;
  }>;
  payments: {
    pendingCount: number;
    pendingTotal: number;
    overdueCount: number;
    overdueTotal: number;
    monthCollected: number;
    monthCount: number;
    pendingList: PaymentItem[];
    overdueList: PaymentItem[];
  };
  profileStats: {
    incomplete: ProfileItem[];
    incompleteCount: number;
    noPortalCount: number;
    totalActive: number;
  };
  unreadMessages: {
    total: number;
    byClient: UnreadClient[];
  };
  birthdays: BirthdayItem[];
  expiringPlans: ExpiringPlan[];
  weeklyWorkoutCompletion: {
    logged: number;
    activePlans: number;
  };
  checkIns: CheckInItem[];
  activityFeed: ActivityItem[];
}

// ─── Component ───

export default function DashboardPage() {
  const t = useT();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const stats = [
    { label: t.dashboard.activeClients, value: data?.clientCount ?? "—", icon: Users, href: "/dashboard/clients", color: "bg-blue-50 text-blue-600" },
    { label: t.dashboard.thisWeek, value: data?.weekSessions ?? "—", icon: Calendar, href: "/dashboard/schedule", color: "bg-purple-50 text-purple-600" },
    { label: t.dashboard.workoutPlans, value: data?.planCount ?? "—", icon: Dumbbell, href: "/dashboard/workouts", color: "bg-brand-50 text-brand-600" },
    { label: t.dashboard.mealPlans, value: data?.mealPlanCount ?? "—", icon: UtensilsCrossed, href: "/dashboard/nutrition", color: "bg-orange-50 text-orange-600" },
  ];

  const fmt = (amount: number, currency: string = "BAM") => `${amount.toFixed(2)} ${currency}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.dashboard.welcome}</p>
      </div>

      {/* Quick Actions */}
      <QuickActions t={t} />

      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card flex flex-col gap-3 transition-shadow hover:shadow-md">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Unread Messages Banner */}
      {data && data.unreadMessages.total > 0 && (
        <UnreadMessagesBanner messages={data.unreadMessages} t={t} />
      )}

      {/* Two-column cascading layout */}
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-8">
          <TodaysSessions data={data} t={t} />
          {data && data.birthdays.length > 0 && (
            <BirthdaysCard birthdays={data.birthdays} t={t} />
          )}
          {data && data.expiringPlans.length > 0 && (
            <ExpiringPlansCard plans={data.expiringPlans} t={t} />
          )}
          {data && data.checkIns.length > 0 && (
            <RecentCheckIns checkIns={data.checkIns} t={t} />
          )}
          {data && data.activityFeed.length > 0 && (
            <ActivityFeed feed={data.activityFeed} t={t} />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-8">
          <PaymentsOverview data={data} t={t} fmt={fmt} />
          {data && <WorkoutCompletionCard completion={data.weeklyWorkoutCompletion} t={t} />}
          <ClientInsights data={data} t={t} />
          <RecentClients data={data} t={t} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function QuickActions({ t }: { t: ReturnType<typeof useT> }) {
  const actions = [
    { label: t.dashboard.addClient, href: "/dashboard/clients/new", icon: Users },
    { label: t.dashboard.scheduleSession, href: "/dashboard/schedule", icon: Calendar },
    { label: t.dashboard.newWorkout, href: "/dashboard/workouts/new", icon: Dumbbell },
    { label: t.dashboard.newMealPlan, href: "/dashboard/nutrition", icon: UtensilsCrossed },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300"
        >
          <Plus className="h-3.5 w-3.5 text-gray-400" />
          {a.label}
        </Link>
      ))}
    </div>
  );
}

function UnreadMessagesBanner({ messages, t }: { messages: DashboardData["unreadMessages"]; t: ReturnType<typeof useT> }) {
  return (
    <Link href="/dashboard/messages" className="mt-6 block">
      <div className="card flex items-center gap-4 border-blue-200 bg-blue-50/50 transition-shadow hover:shadow-md">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
          <MessageSquare className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            {messages.total} {t.dashboard.unreadMessages}
          </p>
          <p className="text-xs text-blue-600">
            {messages.byClient.slice(0, 3).map((c) => c.clientName).join(", ")}
            {messages.byClient.length > 3 && ` +${messages.byClient.length - 3}`}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-blue-400" />
      </div>
    </Link>
  );
}

function TodaysSessions({ data, t }: { data: DashboardData | null; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.todaysSchedule}</h2>
        <Link href="/dashboard/schedule" className="text-sm font-medium text-brand-600 hover:text-brand-700">{t.common.viewAll}</Link>
      </div>
      {!data || data.todaySessions.length === 0 ? (
        <div className="card mt-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t.dashboard.noSessionsToday}</p>
            <Button asChild className="mt-4"><Link href="/dashboard/schedule">{t.dashboard.scheduleSession}</Link></Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.todaySessions.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(s.startTime)} - {formatTime(s.endTime)}
                      {s.clientName && ` · ${s.clientName}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentsOverview({ data, t, fmt }: { data: DashboardData | null; t: ReturnType<typeof useT>; fmt: (a: number, c?: string) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.paymentsOverview}</h2>
        <Link href="/dashboard/billing" className="text-sm font-medium text-brand-600 hover:text-brand-700">{t.common.viewAll}</Link>
      </div>
      <div className="mt-4 space-y-3">
        {/* Monthly collected */}
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">{t.dashboard.collectedThisMonth}</p>
              <p className="text-xl font-bold text-gray-900">{data ? fmt(data.payments.monthCollected) : "—"}</p>
            </div>
            {data && data.payments.monthCount > 0 && (
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                {data.payments.monthCount} {t.dashboard.paid}
              </span>
            )}
          </div>
        </div>

        {/* Overdue */}
        {data && data.payments.overdueCount > 0 && (
          <div className="card border-red-200 bg-red-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">{t.dashboard.overdue}</p>
                <p className="text-lg font-bold text-red-900">{fmt(data.payments.overdueTotal)}</p>
              </div>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">{data.payments.overdueCount}</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-red-200 pt-3">
              {data.payments.overdueList.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/dashboard/clients/${p.clientId}`} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-red-100/50">
                  <span className="text-red-800">{p.clientName}</span>
                  <span className="font-medium text-red-700">{fmt(p.amount, p.currency)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending */}
        {data && data.payments.pendingCount > 0 && (
          <div className="card border-amber-200 bg-amber-50/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-700">{t.dashboard.pending}</p>
                <p className="text-lg font-bold text-amber-900">{fmt(data.payments.pendingTotal)}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">{data.payments.pendingCount}</span>
            </div>
            <div className="mt-3 space-y-1 border-t border-amber-200 pt-3">
              {data.payments.pendingList.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/dashboard/clients/${p.clientId}`} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-amber-100/50">
                  <span className="text-amber-800">{p.clientName}</span>
                  <span className="font-medium text-amber-700">{fmt(p.amount, p.currency)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No payments */}
        {data && data.payments.pendingCount === 0 && data.payments.overdueCount === 0 && data.payments.monthCount === 0 && (
          <div className="card">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <DollarSign className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">{t.dashboard.noPayments}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BirthdaysCard({ birthdays, t }: { birthdays: BirthdayItem[]; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.upcomingBirthdays}</h2>
      <div className="mt-4 space-y-2">
        {birthdays.map((b) => (
          <Link key={b.id} href={`/dashboard/clients/${b.id}`} className="card flex items-center gap-3 transition-shadow hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-50">
              <Cake className="h-4 w-4 text-pink-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
              <p className="text-xs text-gray-500">
                {b.daysUntil === 0
                  ? t.dashboard.today
                  : b.daysUntil === 1
                    ? t.dashboard.tomorrow
                    : `${b.daysUntil} ${t.dashboard.daysAway}`}
                {" · "}
                {t.dashboard.turning} {b.turningAge}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ExpiringPlansCard({ plans, t }: { plans: ExpiringPlan[]; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.expiringPlans}</h2>
      <div className="mt-4 space-y-2">
        {plans.map((p) => {
          const daysLeft = p.endDate
            ? Math.max(0, Math.floor((new Date(p.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null;
          return (
            <Link key={p.id} href={`/dashboard/clients/${p.clientId}`} className="card flex items-center gap-3 transition-shadow hover:shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Timer className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.clientName}</p>
                <p className="text-xs text-gray-500 truncate">{p.planName}</p>
              </div>
              {daysLeft !== null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${daysLeft <= 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {daysLeft === 0 ? t.dashboard.today : `${daysLeft}d`}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RecentCheckIns({ checkIns, t }: { checkIns: CheckInItem[]; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.recentCheckIns}</h2>
        <Link href="/dashboard/check-ins" className="text-sm font-medium text-brand-600 hover:text-brand-700">{t.common.viewAll}</Link>
      </div>
      <div className="mt-4 space-y-2">
        {checkIns.map((c) => (
          <Link key={c.id} href={`/dashboard/clients/${c.clientId}`} className="card flex items-center gap-3 transition-shadow hover:shadow-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.clientName}</p>
              <p className="text-xs text-gray-500">{timeAgo(c.submittedAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function WorkoutCompletionCard({ completion, t }: { completion: DashboardData["weeklyWorkoutCompletion"]; t: ReturnType<typeof useT> }) {
  const pct = completion.activePlans > 0
    ? Math.round((completion.logged / completion.activePlans) * 100)
    : 0;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.weeklyCompletion}</h2>
      <div className="card mt-4">
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f3f4f6" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none" stroke="currentColor"
                strokeWidth="3" strokeDasharray={`${pct} 100`}
                strokeLinecap="round"
                className="text-brand-500"
              />
            </svg>
            <span className="absolute text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t.dashboard.workoutsLogged}</p>
            <p className="text-lg font-bold text-gray-900">
              {completion.logged} / {completion.activePlans}
            </p>
            <p className="text-xs text-gray-400">{t.dashboard.thisWeek}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientInsights({ data, t }: { data: DashboardData | null; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.clientInsights}</h2>
        <Link href="/dashboard/clients" className="text-sm font-medium text-brand-600 hover:text-brand-700">{t.common.viewAll}</Link>
      </div>
      <div className="mt-4 space-y-3">
        {data && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <UserCheck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{data.profileStats.totalActive - data.profileStats.noPortalCount}</p>
                <p className="text-[11px] text-gray-500">{t.dashboard.portalActive}</p>
              </div>
            </div>
            <div className="card flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <UserX className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{data.profileStats.noPortalCount}</p>
                <p className="text-[11px] text-gray-500">{t.dashboard.noPortal}</p>
              </div>
            </div>
          </div>
        )}

        {data && data.profileStats.incompleteCount > 0 && (
          <div className="card">
            <p className="mb-3 text-sm font-medium text-gray-700">
              {t.dashboard.incompleteProfiles} ({data.profileStats.incompleteCount})
            </p>
            <div className="space-y-2">
              {data.profileStats.incomplete.map((client) => (
                <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50">
                  <Avatar name={client.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-gray-200">
                        <div className="h-1.5 rounded-full bg-brand-500 transition-all" style={{ width: `${(client.filled / client.total) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-gray-400">{client.filled}/{client.total}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {data && data.profileStats.incompleteCount === 0 && data.profileStats.totalActive > 0 && (
          <div className="card">
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <UserCheck className="h-8 w-8 text-green-400" />
              <p className="mt-2 text-sm text-gray-500">{t.dashboard.allProfilesComplete}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityFeed({ feed, t }: { feed: ActivityItem[]; t: ReturnType<typeof useT> }) {
  const iconMap = {
    payment: { icon: DollarSign, bg: "bg-green-50", fg: "text-green-600" },
    workout: { icon: Dumbbell, bg: "bg-brand-50", fg: "text-brand-600" },
    checkin: { icon: ClipboardCheck, bg: "bg-blue-50", fg: "text-blue-600" },
    message: { icon: Send, bg: "bg-purple-50", fg: "text-purple-600" },
  };

  const labelMap: Record<string, string> = {
    payment: t.dashboard.actPayment,
    workout: t.dashboard.actWorkout,
    checkin: t.dashboard.actCheckIn,
    message: t.dashboard.actMessage,
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.recentActivity}</h2>
      <div className="card mt-4">
        <div className="space-y-4">
          {feed.map((item, i) => {
            const cfg = iconMap[item.type];
            const Icon = cfg.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.fg}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.text}</span>
                    {" "}
                    <span className="text-gray-500">{labelMap[item.type]}</span>
                  </p>
                  {item.detail && (
                    <p className="text-xs text-gray-500 truncate">{item.detail}</p>
                  )}
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.date)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RecentClients({ data, t }: { data: DashboardData | null; t: ReturnType<typeof useT> }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{t.dashboard.recentClients}</h2>
        <Link href="/dashboard/clients" className="text-sm font-medium text-brand-600 hover:text-brand-700">{t.common.viewAll}</Link>
      </div>
      {!data || data.recentClients.length === 0 ? (
        <div className="card mt-4">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">{t.dashboard.noClients}</p>
            <Button asChild className="mt-4"><Link href="/dashboard/clients/new">{t.dashboard.addClient}</Link></Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.recentClients.map((client) => (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="card flex items-center gap-4 transition-shadow hover:shadow-md">
              <Avatar name={client.name} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{client.name}</p>
                {client.goals && <p className="text-sm text-gray-500 truncate">{client.goals}</p>}
              </div>
              <StatusBadge status={client.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
