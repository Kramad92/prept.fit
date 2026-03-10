"use client";

import { useState, useEffect } from "react";
import { X, Dumbbell, UtensilsCrossed, Search, User, Users, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

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
  onSelect: (templateId: string, mode?: string, aiAdjust?: boolean) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ type, onSelect, onClose }: TemplatePickerModalProps) {
  const t = useT();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"solo" | "live">("solo");
  const [aiAdjust, setAiAdjust] = useState(true);

  useEffect(() => {
    const url = type === "workout" ? "/api/workouts" : "/api/meal-plans";
    fetch(url)
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = templates.filter((tmpl) =>
    tmpl.name.toLowerCase().includes(search.toLowerCase())
  );

  const Icon = type === "workout" ? Dumbbell : UtensilsCrossed;
  const iconBg = type === "workout" ? "bg-brand-50" : "bg-orange-50";
  const iconColor = type === "workout" ? "text-brand-600" : "text-orange-600";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {type === "workout" ? t.assign.assignWorkoutTemplate : t.assign.assignMealTemplate}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {type === "workout" && (
          <div className="mt-4 flex gap-2">
            <button onClick={() => setMode("solo")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === "solo" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <User className="h-4 w-4" /> {t.workouts.solo}
            </button>
            <button onClick={() => setMode("live")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${mode === "live" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              <Users className="h-4 w-4" /> {t.workouts.liveWithCoach}
            </button>
          </div>
        )}

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t.assign.searchTemplates}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={aiAdjust}
            onChange={(e) => setAiAdjust(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
          />
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">{t.assign.aiAdjustForClient}</span>
        </label>

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              {t.assign.noTemplatesFound}
            </p>
          ) : (
            filtered.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => onSelect(tmpl.id, mode, aiAdjust)}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{tmpl.name}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    {tmpl.description && <span className="line-clamp-1">{tmpl.description}</span>}
                    {tmpl.exerciseCount != null && <span>{tmpl.exerciseCount} {t.workouts.exercises_count}</span>}
                    {tmpl.mealCount != null && <span>{tmpl.mealCount} {t.nutrition.meals_count}</span>}
                    {tmpl.targetCalories && <span>{tmpl.targetCalories} {t.nutrition.kcal}</span>}
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
