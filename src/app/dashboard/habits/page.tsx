"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface HabitTemplate {
  id: string;
  name: string;
  icon: string | null;
}

const PRESET_HABITS = [
  { name: "Drink 2L water", icon: "💧" },
  { name: "10,000 steps", icon: "🚶" },
  { name: "8 hours sleep", icon: "😴" },
  { name: "Eat 5 servings of vegetables", icon: "🥦" },
  { name: "Take supplements", icon: "💊" },
  { name: "Stretch for 10 minutes", icon: "🧘" },
  { name: "No processed sugar", icon: "🚫" },
  { name: "Track meals", icon: "📝" },
];

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then(setHabits)
      .finally(() => setLoading(false));
  }, []);

  async function createHabit(name: string, icon: string) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, icon }),
    });

    if (res.ok) {
      const habit = await res.json();
      setHabits((prev) => [habit, ...prev]);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create habits and assign them to clients
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Habit
        </button>
      </div>

      {/* Quick Add Presets */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">Quick Add</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_HABITS.filter(
            (p) => !habits.some((h) => h.name === p.name)
          ).map((preset) => (
            <button
              key={preset.name}
              onClick={() => createHabit(preset.name, preset.icon)}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              <span>{preset.icon}</span>
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Existing Habits */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-700">Your Habits</h2>
        {habits.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Sparkles}
              title="No habits created"
              description="Create habits to assign to your clients for daily accountability."
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {habits.map((habit) => (
              <div
                key={habit.id}
                className="card flex items-center gap-3"
              >
                <span className="text-2xl">{habit.icon || "✅"}</span>
                <p className="font-medium text-gray-900">{habit.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <h2 className="text-lg font-semibold">Create Custom Habit</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newName.trim()) {
                  createHabit(newName.trim(), newIcon || "✅");
                  setNewName("");
                  setNewIcon("");
                  setShowCreate(false);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Habit Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input mt-1"
                  placeholder="Walk 30 minutes"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                  className="input mt-1"
                  placeholder="🏃"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
