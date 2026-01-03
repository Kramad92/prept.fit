"use client";

import { useState, useEffect } from "react";
import { X, Dumbbell, UtensilsCrossed, Search } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  exerciseCount?: number;
  mealCount?: number;
  targetCalories?: number | null;
}

interface TemplatePickerModalProps {
  type: "workout" | "nutrition";
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ type, onSelect, onClose }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = type === "workout" ? "/api/workouts" : "/api/meal-plans";
    fetch(url)
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const Icon = type === "workout" ? Dumbbell : UtensilsCrossed;
  const iconBg = type === "workout" ? "bg-brand-50" : "bg-orange-50";
  const iconColor = type === "workout" ? "text-brand-600" : "text-orange-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {type === "workout" ? "Assign Workout Template" : "Assign Meal Plan Template"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No templates found.
            </p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    {t.description && <span className="line-clamp-1">{t.description}</span>}
                    {t.exerciseCount != null && <span>{t.exerciseCount} exercises</span>}
                    {t.mealCount != null && <span>{t.mealCount} meals</span>}
                    {t.targetCalories && <span>{t.targetCalories} cal</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
