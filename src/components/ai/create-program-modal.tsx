"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Dumbbell, UtensilsCrossed, FolderOpen, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLocale } from "@/lib/i18n";
import { toast } from "sonner";

interface CreateProgramModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: "workout" | "nutrition";
}

export function CreateProgramModal({ open, onClose, defaultType = "workout" }: CreateProgramModalProps) {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [type, setType] = useState<"workout" | "nutrition">(defaultType);
  const [prompt, setPrompt] = useState("");
  const [source, setSource] = useState<"existing" | "generate">("generate");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(type === "workout" ? 3 : 3);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  function handleTypeChange(newType: "workout" | "nutrition") {
    setType(newType);
    if (newType === "workout" && daysPerWeek > 7) setDaysPerWeek(3);
  }

  async function handleGenerate() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setProgress(source === "generate"
      ? (t.programs.generatingPlans || "Generating plans...")
      : (t.programs.generating || "Generating..."));

    try {
      const res = await fetch("/api/ai/generate-full-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          prompt: prompt.trim(),
          source,
          durationWeeks,
          daysPerWeek,
          locale,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate program");
      }

      const result = await res.json();

      toast.success(
        result.plansCreated > 0
          ? `${t.programs.programCreated || "Program created"} (${result.plansCreated} ${type === "workout" ? t.programs.workoutsCount : t.programs.mealPlansCount} ${t.programs.generated || "generated"})`
          : (t.programs.programCreated || "Program created")
      );

      onClose();

      const path = type === "workout"
        ? `/dashboard/programs/${result.programId}`
        : `/dashboard/programs/nutrition/${result.programId}`;
      router.push(path);
    } catch (e) {
      setError(e instanceof Error ? e.message : (t.programs.aiError || "Generation failed"));
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand-600" />
            {t.programs.aiCreateProgram || "AI Program Builder"}
          </DialogTitle>
          <DialogDescription>
            {t.programs.aiCreateProgramDesc || "Describe your program and let AI build it for you."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Program type toggle */}
          <div>
            <label className="label">{t.programs.programType || "Program type"}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange("workout")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "workout"
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Dumbbell className="h-4 w-4" />
                {t.programs.workoutTab}
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("nutrition")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  type === "nutrition"
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <UtensilsCrossed className="h-4 w-4" />
                {t.programs.nutritionTab}
              </button>
            </div>
          </div>

          {/* Source toggle */}
          <div>
            <label className="label">{t.programs.planSource || "Plan source"}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource("existing")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  source === "existing"
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                {t.programs.useExisting || "Use existing"}
              </button>
              <button
                type="button"
                onClick={() => setSource("generate")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  source === "generate"
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Wand2 className="h-4 w-4" />
                {t.programs.generateNew || "Generate new"}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {source === "existing"
                ? (t.programs.useExistingDesc || "Build a program from your existing workout/meal plans.")
                : (t.programs.generateNewDesc || "AI creates new plans and saves them to your library.")}
            </p>
          </div>

          {/* Prompt */}
          <div>
            <label className="label">{t.programs.descriptionPlaceholder || "Describe this program..."}</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={type === "workout"
                ? (t.programs.aiPromptWorkoutPlaceholder || "e.g. 4-week push/pull/legs strength program, progressive overload...")
                : (t.programs.aiPromptNutritionPlaceholder || "e.g. 4-week meal prep program, 2200 cal/day, high protein...")}
              rows={3}
            />
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t.programs.durationWeeks}</label>
              <NumberStepper
                value={durationWeeks}
                onChange={setDurationWeeks}
                min={1}
                max={12}
                suffix={t.programs.weeks}
              />
            </div>
            <div>
              <label className="label">
                {type === "workout" ? t.programs.trainingDays : (t.programs.mealsPerDay || "Meals/day")}
              </label>
              <NumberStepper
                value={daysPerWeek}
                onChange={setDaysPerWeek}
                min={1}
                max={type === "workout" ? 7 : 8}
                suffix={type === "workout" ? t.programs.daysWeek : (t.programs.mealsPerDay || "meals/day")}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {progress}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t.programs.buildProgram || "Build Program"}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t.common.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
