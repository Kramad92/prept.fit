"use client";

import { useState, useEffect } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";

interface HabitLog {
  id: string;
  date: string;
  completed: boolean;
}

interface ClientHabit {
  id: string;
  habit: { id: string; name: string; icon: string | null };
  logs: HabitLog[];
}

export default function PortalHabitsPage() {
  const t = useT();
  const [habits, setHabits] = useState<ClientHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  useEffect(() => {
    fetch("/api/habits/log?days=30")
      .then((r) => r.json())
      .then(setHabits)
      .finally(() => setLoading(false));
  }, []);

  async function toggleHabit(clientHabitId: string, date: Date) {
    setToggling(clientHabitId);
    const dateStr = format(date, "yyyy-MM-dd");

    // Check if already logged
    const habit = habits.find((h) => h.id === clientHabitId);
    const existingLog = habit?.logs.find(
      (l) => l.date.startsWith(dateStr)
    );

    await fetch("/api/habits/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientHabitId,
        date: dateStr,
        completed: !existingLog?.completed,
      }),
    });

    // Reload
    const updated = await fetch("/api/habits/log?days=30").then((r) =>
      r.json()
    );
    setHabits(updated);
    setToggling(null);
  }

  function isCompleted(habit: ClientHabit, date: Date): boolean {
    const dateStr = format(date, "yyyy-MM-dd");
    return habit.logs.some(
      (l) => l.date.startsWith(dateStr) && l.completed
    );
  }

  // Calculate streak
  function getStreak(habit: ClientHabit): number {
    let streak = 0;
    let d = today;
    while (true) {
      const dateStr = format(d, "yyyy-MM-dd");
      const log = habit.logs.find(
        (l) => l.date.startsWith(dateStr) && l.completed
      );
      if (log) {
        streak++;
        d = subDays(d, 1);
      } else {
        break;
      }
    }
    return streak;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t.portalHabits.dailyHabits}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.portalHabits.checkOff}
      </p>

      {habits.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Sparkles}
            title={t.portalHabits.noHabitsTitle}
            description={t.portalHabits.noHabitsDescFull}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {/* Day headers */}
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-gray-500 pb-3 pr-4 min-w-[140px]">
                    {t.portalHabits.habit}
                  </th>
                  {last7Days.map((d) => (
                    <th
                      key={d.toISOString()}
                      className={cn(
                        "pb-3 text-center text-xs font-medium min-w-[44px]",
                        format(d, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
                          ? "text-brand-600"
                          : "text-gray-400"
                      )}
                    >
                      <div>{format(d, "EEE")}</div>
                      <div className="text-sm">{format(d, "d")}</div>
                    </th>
                  ))}
                  <th className="pb-3 text-center text-xs font-medium text-gray-400 min-w-[50px]">
                    {t.portalHabits.streak}
                  </th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const streak = getStreak(habit);
                  return (
                    <tr key={habit.id} className="border-t border-gray-100">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {habit.habit.icon || "✅"}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {habit.habit.name}
                          </span>
                        </div>
                      </td>
                      {last7Days.map((d) => {
                        const done = isCompleted(habit, d);
                        const isToday =
                          format(d, "yyyy-MM-dd") ===
                          format(today, "yyyy-MM-dd");

                        return (
                          <td key={d.toISOString()} className="py-3 text-center">
                            <button
                              onClick={() => toggleHabit(habit.id, d)}
                              disabled={toggling === habit.id}
                              className={cn(
                                "mx-auto flex h-9 w-9 items-center justify-center rounded-lg transition-all",
                                done
                                  ? "bg-brand-600 text-white"
                                  : isToday
                                    ? "border-2 border-brand-300 bg-brand-50 hover:bg-brand-100"
                                    : "border border-gray-200 bg-gray-50 hover:bg-gray-100"
                              )}
                            >
                              {done && <Check className="h-5 w-5" />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="py-3 text-center">
                        {streak > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                            🔥 {streak}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
