"use client";

import { useState, useEffect } from "react";
import { Plus, Sparkles, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/ui/toast";

interface HabitTemplate {
  id: string;
  name: string;
  icon: string | null;
}

export default function HabitsPage() {
  const t = useT();

  const PRESET_HABITS = [
    { name: t.habits.presetDrinkWater, icon: "💧" },
    { name: t.habits.presetSteps, icon: "🚶" },
    { name: t.habits.presetSleep, icon: "😴" },
    { name: t.habits.presetVegetables, icon: "🥦" },
    { name: t.habits.presetSupplements, icon: "💊" },
    { name: t.habits.presetStretch, icon: "🧘" },
    { name: t.habits.presetNoSugar, icon: "🚫" },
    { name: t.habits.presetTrackMeals, icon: "📝" },
  ];
  const { toastSuccess, toastError } = useToast();
  const [habits, setHabits] = useState<HabitTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [editingHabit, setEditingHabit] = useState<HabitTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

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

  async function updateHabit(id: string, name: string, icon: string) {
    const res = await fetch("/api/habits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, icon }),
    });

    if (res.ok) {
      const updated = await res.json();
      setHabits((prev) => prev.map((h) => (h.id === id ? updated : h)));
      toastSuccess(t.habits.habitUpdated);
    } else {
      toastError(t.errors.failedToLoad);
    }
  }

  async function deleteHabit(id: string) {
    const res = await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      toastSuccess(t.habits.habitDeleted);
    } else {
      toastError(t.errors.failedToLoad);
    }
  }

  function startEdit(habit: HabitTemplate) {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditIcon(habit.icon || "");
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
          <h1 className="text-2xl font-bold text-gray-900">{t.habits.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.habits.createAndAssign}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t.habits.newHabit}</span>
        </button>
      </div>

      {/* Quick Add Presets */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">{t.habits.quickAdd}</h2>
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
        <h2 className="text-sm font-semibold text-gray-700">{t.habits.yourHabits}</h2>
        {habits.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={Sparkles}
              title={t.habits.noHabitsCreated}
              description={t.habits.noHabitsCreatedDesc}
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
                <p className="flex-1 font-medium text-gray-900">{habit.name}</p>
                <button
                  onClick={() => startEdit(habit)}
                  className="rounded p-1.5 text-gray-300 hover:bg-brand-50 hover:text-brand-600"
                  title={t.common.edit}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteHabit(habit.id)}
                  className="rounded p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
                  title={t.common.delete}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <h2 className="text-lg font-semibold">{t.habits.createCustomHabit}</h2>
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
                  {t.habits.habitName}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input mt-1"
                  placeholder={t.habits.walkMinutes}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.habits.iconEmoji}
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
                  {t.common.create}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingHabit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <h2 className="text-lg font-semibold">{t.habits.editHabit}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editName.trim()) {
                  updateHabit(editingHabit.id, editName.trim(), editIcon || "✅");
                  setEditingHabit(null);
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.habits.habitName}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input mt-1"
                  placeholder={t.habits.walkMinutes}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.habits.iconEmoji}
                </label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value)}
                  className="input mt-1"
                  placeholder="🏃"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  {t.common.save}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingHabit(null)}
                  className="btn-secondary"
                >
                  {t.common.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
