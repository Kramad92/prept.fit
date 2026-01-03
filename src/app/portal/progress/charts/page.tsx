"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { ProgressChart } from "@/components/charts/progress-chart";

interface ChartData {
  measurements: Array<{
    date: string;
    weight: number | null;
    bodyFat: number | null;
    chest: number | null;
    waist: number | null;
    hips: number | null;
    arms: number | null;
    thighs: number | null;
  }>;
  workoutLogs: Array<{ week: string; count: number }>;
  totalWorkouts: number;
}

export default function ProgressChartsPage() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients/me/progress-chart")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!data || data.measurements.length === 0) {
    return (
      <div>
        <Link
          href="/portal/progress"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to progress
        </Link>
        <div className="card mt-6 flex flex-col items-center py-10 text-center">
          <TrendingUp className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            Not enough data yet to show charts. Your coach will log measurements
            during sessions.
          </p>
        </div>
      </div>
    );
  }

  const metrics = [
    { key: "weight", label: "Weight", color: "#22c55e", unit: "kg" },
    { key: "bodyFat", label: "Body Fat", color: "#f59e0b", unit: "%" },
    { key: "waist", label: "Waist", color: "#8b5cf6", unit: "cm" },
    { key: "chest", label: "Chest", color: "#3b82f6", unit: "cm" },
    { key: "arms", label: "Arms", color: "#ef4444", unit: "cm" },
    { key: "hips", label: "Hips", color: "#ec4899", unit: "cm" },
    { key: "thighs", label: "Thighs", color: "#14b8a6", unit: "cm" },
  ];

  return (
    <div>
      <Link
        href="/portal/progress"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to progress
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        Progress Charts
      </h1>

      {/* Summary Cards */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.totalWorkouts}
          </p>
          <p className="text-xs text-gray-500">Total Workouts</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">
            {data.measurements.length}
          </p>
          <p className="text-xs text-gray-500">Measurements</p>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 space-y-8">
        {metrics.map((metric) => {
          const chartData = data.measurements.map((m) => ({
            date: m.date,
            value: (m as any)[metric.key] as number | null,
          }));

          const hasData = chartData.some((d) => d.value !== null);
          if (!hasData) return null;

          return (
            <div key={metric.key} className="card">
              <ProgressChart
                data={chartData}
                label={metric.label}
                color={metric.color}
                unit={metric.unit}
              />
            </div>
          );
        })}

        {/* Workout Frequency Chart */}
        {data.workoutLogs.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Weekly Workouts
            </h3>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {data.workoutLogs.map((w) => {
                const maxCount = Math.max(
                  ...data.workoutLogs.map((l) => l.count)
                );
                const pct = (w.count / maxCount) * 100;
                return (
                  <div
                    key={w.week}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-xs font-medium text-gray-600">
                      {w.count}
                    </span>
                    <div
                      className="w-full rounded-t bg-brand-500"
                      style={{ height: `${pct}%`, minHeight: 4 }}
                    />
                    <span className="text-[9px] text-gray-400">
                      {new Date(w.week + "T12:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
