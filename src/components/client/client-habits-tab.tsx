"use client";

import { useState, useEffect } from "react";
import { Plus, X, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { AssignedHabit, HabitTemplate } from "@/types";

interface ClientHabitsTabProps {
  clientId: string;
}

function recentStreak(logs: Array<{ date: string; completed: boolean }>) {
  const last7 = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7.add(d.toISOString().split("T")[0]);
  }
  return logs.filter((l) => l.completed && last7.has(l.date.split("T")[0])).length;
}

export function ClientHabitsTab({ clientId }: ClientHabitsTabProps) {
  const t = useT();
  const [assignedHabits, setAssignedHabits] = useState<AssignedHabit[]>([]);
  const [allHabits, setAllHabits] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);


  function loadHabits() {
    Promise.all([
      api.get<AssignedHabit[]>(`/api/habits/assign?clientId=${clientId}`),
      api.get<HabitTemplate[]>("/api/habits"),
    ])
      .then(([assigned, all]) => {
        setAssignedHabits(assigned);
        setAllHabits(all);
      })
      .catch(() => toast.error(t.errors.failedToLoad))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadHabits(); }, [clientId]);

  const assignedIds = new Set(assignedHabits.map((ah) => ah.habit.id));
  const unassigned = allHabits.filter((h) => !assignedIds.has(h.id));

  async function assignHabit(habitId: string) {
    try {
      await api.post("/api/habits/assign", { clientId, habitIds: [habitId] });
      toast.success(t.habits.habitAssigned);
      loadHabits();
    } catch {
      toast.error(t.errors.failedToLoad);
    }
  }

  async function removeHabit(clientHabitId: string) {
    try {
      await api.delete(`/api/habits/assign?id=${clientHabitId}`);
      toast.success(t.habits.habitRemoved);
      loadHabits();
    } catch {
      toast.error(t.errors.failedToLoad);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.habits.assignedHabits} ({assignedHabits.length})
        </h3>
        {!showAssign && unassigned.length > 0 && (
          <Button onClick={() => setShowAssign(true)} className="text-sm">
            <Plus className="mr-1 h-4 w-4" />
            {t.habits.assignHabit}
          </Button>
        )}
      </div>

      {showAssign && (
        <div className="card mb-4 border-2 border-brand-200">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">{t.habits.assignHabits}</h4>
            <button onClick={() => setShowAssign(false)} className="rounded p-1 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          {unassigned.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              {t.habits.allAssigned}{" "}
              <a href="/dashboard/habits" className="font-medium text-brand-600 hover:underline">
                {t.habits.habitsPage}
              </a>.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {unassigned.map((h) => (
                <button
                  key={h.id}
                  onClick={() => assignHabit(h.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <span>{h.icon || "✅"}</span>
                  {h.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {assignedHabits.length === 0 && !showAssign ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <Sparkles className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.habits.noHabitsAssigned}</p>
          <button
            onClick={() => setShowAssign(true)}
            className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t.habits.assignHabits}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {assignedHabits.map((ah) => {
            const streak = recentStreak(ah.logs);
            return (
              <div key={ah.id} className="card flex items-center gap-3">
                <span className="text-2xl">{ah.habit.icon || "✅"}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{ah.habit.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        const dateStr = d.toISOString().split("T")[0];
                        const done = ah.logs.some(
                          (l) => l.completed && l.date.split("T")[0] === dateStr
                        );
                        return (
                          <div
                            key={i}
                            className={`h-3 w-3 rounded-sm ${
                              done ? "bg-brand-500" : "bg-gray-200"
                            }`}
                            title={dateStr}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs text-gray-400">{streak}/7 {t.habits.thisWeek}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeHabit(ah.id)}
                  className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  title={t.habits.removeHabit}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
