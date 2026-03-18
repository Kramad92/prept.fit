"use client";

import { useState, useEffect } from "react";
import { Dumbbell, UtensilsCrossed, Search, User, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin top-auto bottom-0 translate-y-0 rounded-t-2xl rounded-b-none md:top-[50%] md:translate-y-[-50%] md:bottom-auto md:rounded-xl">
        <DialogHeader>
          <DialogTitle>
            {type === "workout" ? t.assign.assignWorkoutTemplate : t.assign.assignMealTemplate}
          </DialogTitle>
        </DialogHeader>

        {type === "workout" && (
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "solo" ? "default" : "outline"} onClick={() => setMode("solo")}>
              <User className="h-4 w-4" /> {t.workouts.solo}
            </Button>
            <Button size="sm" variant={mode === "live" ? "default" : "outline"} onClick={() => setMode("live")}>
              <Users className="h-4 w-4" /> {t.workouts.liveWithCoach}
            </Button>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder={t.assign.searchTemplates}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <label className="flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={aiAdjust}
            onChange={(e) => setAiAdjust(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
          />
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span className="text-sm font-medium text-brand-700">{t.assign.aiAdjustForClient}</span>
        </label>

        <div className="max-h-80 space-y-2 overflow-y-auto">
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
      </DialogContent>
    </Dialog>
  );
}
