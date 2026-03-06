"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Calendar, Dumbbell, Camera, CalendarPlus, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n";

interface PortalData {
  name: string;
  goals: string | null;
  tenant: { name: string; brandColor: string; logo: string | null };
  schedules: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    type: string;
  }>;
  assignedPlans: Array<{
    id: string;
    workoutPlan: { id: string; name: string };
  }>;
  progressPhotos: Array<{ id: string }>;
  measurements: Array<{
    id: string;
    date: string;
    weight: number | null;
    bodyFat: number | null;
  }>;
}

export default function PortalHomePage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = locale === "bs" ? "bs-BA" : "en-US";
  const [data, setData] = useState<PortalData | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">{data.tenant.name}</p>
        <h1 className="text-2xl font-bold text-gray-900">
          {t.portal.welcome}, {data.name.split(" ")[0]}
        </h1>
        {data.goals && (
          <p className="mt-1 text-sm text-gray-500">{t.portal.goals}: {data.goals}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link
          href="/portal/book"
          className="card flex flex-col items-center gap-2 py-4 text-center transition-shadow hover:shadow-md"
        >
          <CalendarPlus className="h-6 w-6 text-brand-600" />
          <span className="text-sm font-medium">{t.portal.bookSession}</span>
        </Link>
        <Link
          href="/portal/workouts"
          className="card flex flex-col items-center gap-2 py-4 text-center transition-shadow hover:shadow-md"
        >
          <Dumbbell className="h-6 w-6 text-brand-600" />
          <span className="text-sm font-medium">{t.portal.myWorkouts}</span>
        </Link>
        <Link
          href="/portal/progress"
          className="card flex flex-col items-center gap-2 py-4 text-center transition-shadow hover:shadow-md"
        >
          <Camera className="h-6 w-6 text-brand-600" />
          <span className="text-sm font-medium">{t.portal.progress}</span>
        </Link>
        <div className="card flex flex-col items-center gap-2 py-4 text-center">
          <Calendar className="h-6 w-6 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">
            {data.schedules.length} {t.portal.upcoming}
          </span>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.portal.upcomingSessions}
          </h2>
          <Link
            href="/portal/book"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t.portal.bookASession}
          </Link>
        </div>

        {data.schedules.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {t.portal.noUpcomingSessions}
            </p>
            <Link href="/portal/book" className="btn-primary mt-4">
              {t.portal.bookASession}
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {data.schedules.map((session) => (
              <div key={session.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{session.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {new Date(session.date).toLocaleDateString(dateLocale, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      &middot; {formatTime(session.startTime)} -{" "}
                      {formatTime(session.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={session.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Latest Measurement */}
      {data.measurements.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">{t.portal.latestStats}</h2>
          <div className="card mt-4">
            <p className="text-xs text-gray-400">
              {new Date(data.measurements[0].date).toLocaleDateString()}
            </p>
            <div className="mt-2 flex gap-8">
              {data.measurements[0].weight && (
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.measurements[0].weight}
                  </p>
                  <p className="text-xs text-gray-500">{t.measurements.weight}</p>
                </div>
              )}
              {data.measurements[0].bodyFat && (
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {data.measurements[0].bodyFat}%
                  </p>
                  <p className="text-xs text-gray-500">{t.measurements.bodyFat}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
