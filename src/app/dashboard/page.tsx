"use client";

import { useState, useEffect } from "react";
import { Users, Calendar, Dumbbell, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";

interface DashboardData {
  clientCount: number;
  weekSessions: number;
  planCount: number;
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
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const stats = [
    { label: "Active Clients", value: data?.clientCount ?? "—", icon: Users, href: "/dashboard/clients" },
    { label: "This Week", value: data?.weekSessions ?? "—", icon: Calendar, href: "/dashboard/schedule" },
    { label: "Workout Plans", value: data?.planCount ?? "—", icon: Dumbbell, href: "/dashboard/workouts" },
    { label: "Completion Rate", value: "—", icon: TrendingUp, href: "#" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back. Here&apos;s your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card flex flex-col gap-3 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <stat.icon className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Today&apos;s Schedule
          </h2>
          <Link
            href="/dashboard/schedule"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>

        {!data || data.todaySessions.length === 0 ? (
          <div className="card mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No sessions scheduled for today.
              </p>
              <Link href="/dashboard/schedule" className="btn-primary mt-4">
                Schedule a session
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.todaySessions.map((session) => (
              <div key={session.id} className="card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                      <Clock className="h-5 w-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{session.title}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                        {session.clientName && ` · ${session.clientName}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Clients */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Clients
          </h2>
          <Link
            href="/dashboard/clients"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View all
          </Link>
        </div>

        {!data || data.recentClients.length === 0 ? (
          <div className="card mt-4">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                No clients yet. Add your first client to get started.
              </p>
              <Link href="/dashboard/clients/new" className="btn-primary mt-4">
                Add client
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {data.recentClients.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
                className="card flex items-center gap-4 transition-shadow hover:shadow-md"
              >
                <Avatar name={client.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{client.name}</p>
                  {client.goals && (
                    <p className="text-sm text-gray-500 truncate">{client.goals}</p>
                  )}
                </div>
                <StatusBadge status={client.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
