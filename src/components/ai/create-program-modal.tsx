"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Dumbbell, UtensilsCrossed, AlertTriangle } from "lucide-react";
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

interface FitFeedback {
  missingPlans: string[];
  existingCount: number;
  totalNeeded: number;
  fit: "good" | "partial" | "poor";
}

export function CreateProgramModal({ open, onClose, defaultType = "workout" }: CreateProgramModalProps) {
  const { t, locale } = useLocale();
  const router = useRouter();

  const [type, setType] = useState<"workout" | "nutrition">(defaultType);
  const [prompt, setPrompt] = useState("");
  const [generateNew, setGenerateNew] = useState(false);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [planCount, setPlanCount] = useState<number | null>(null);
  const [fitFeedback, setFitFeedback] = useState<FitFeedback | null>(null);

  // Fetch existing plan count when modal opens or type changes
  useEffect(() => {
    if (!open) return;
    setPlanCount(null);
    setFitFeedback(null);
    const endpoint = type === "workout" ? "/api/workouts" : "/api/meal-plans";
    fetch(endpoint)
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown[]) => {
        setPlanCount(data.length);
        if (data.length === 0) setGenerateNew(true);
      })
      .catch(() => setPlanCount(null));
  }, [open, type]);

  // Clear fit feedback when user changes relevant inputs
  useEffect(() => {
    setFitFeedback(null);
  }, [prompt, type, durationWeeks, daysPerWeek]);

  function handleTypeChange(newType: "workout" | "nutrition") {
    setType(newType);
    if (newType === "workout" && daysPerWeek > 7) setDaysPerWeek(3);
  }

  async function handleSubmit() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      setProgress(
        generateNew
          ? (t.programs.generatingPlans || "Generating plans...")
          : (t.programs.generating || "Generating...")
      );

      const res = await fetch("/api/ai/generate-full-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt: prompt.trim(), generateNew, durationWeeks, daysPerWeek, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate program");
      }
      const result = await res.json();

      // Handle fit feedback — API says generation is needed
      if (result.needsGeneration) {
        setFitFeedback({
          missingPlans: result.missingPlans || [],
          existingCount: result.existingCount || 0,
          totalNeeded: result.totalNeeded || 0,
          fit: result.fit || "poor",
        });
        setLoading(false);
        setProgress("");
        return;
      }

      // Success
      const parts: string[] = [];
      if (result.plansCreated > 0) {
        parts.push(`${result.plansCreated} ${t.programs.generated || "generated"}`);
      }
      if (result.plansReused > 0) {
        parts.push(`${result.plansReused} ${t.programs.reused || "reused"}`);
      }

      toast.success(
        parts.length > 0
          ? `${t.programs.programCreated || "Program created"} (${parts.join(", ")})`
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
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
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
                disabled={loading}
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
                disabled={loading}
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

          {/* Generate new plans checkbox */}
          <div className="space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={generateNew}
                onChange={(e) => {
                  setGenerateNew(e.target.checked);
                  if (e.target.checked) setFitFeedback(null);
                }}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {t.programs.generateNew || "Generate new plans"}
                </span>
                <p className="text-xs text-gray-500">
                  {t.programs.generateNewCheckboxDesc || "Generate new plans with AI if you don't have matching or enough existing plans."}
                </p>
              </div>
            </label>
            {planCount !== null && !fitFeedback && (
              <p className={`text-xs pl-6.5 ${planCount === 0 ? "text-amber-600" : "text-gray-400"}`}>
                {planCount === 0
                  ? (type === "workout"
                    ? (t.programs.noWorkoutsAvailable || "No workout plans yet — new plans will be generated.")
                    : (t.programs.noMealPlansAvailable || "No meal plans yet — new plans will be generated."))
                  : `${planCount} ${type === "workout" ? (t.programs.workoutsCount || "workouts") : (t.programs.mealPlansCount || "meal plans")} ${t.programs.available || "available"}`}
              </p>
            )}
          </div>

          {/* Fit feedback */}
          {fitFeedback && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">
                    {fitFeedback.fit === "poor"
                      ? (t.programs.fitPoor || "Your existing plans don't match this program.")
                      : (t.programs.fitPartial || "Your existing plans partially match this program.")}
                  </p>
                  {fitFeedback.existingCount > 0 && (
                    <p className="mt-0.5 text-amber-700">
                      {fitFeedback.existingCount} / {fitFeedback.totalNeeded} {t.programs.plansMatch || "plans match"}
                    </p>
                  )}
                </div>
              </div>
              {fitFeedback.missingPlans.length > 0 && (
                <div className="pl-6">
                  <p className="text-xs font-medium text-amber-700">
                    {t.programs.missingPlans || "Missing plans:"}
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {fitFeedback.missingPlans.map((name, i) => (
                      <li key={i} className="text-xs text-amber-700">• {name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-amber-600 pl-6">
                {t.programs.fitCheckboxHint || "Check \"Generate new plans\" above to create the missing plans automatically."}
              </p>
            </div>
          )}

          {/* Prompt */}
          <div>
            <label className="label">{t.programs.descriptionPlaceholder || "Describe this program..."}</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
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
            <p className="break-words text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || loading}
              className="flex-1 bg-brand-600 text-white hover:bg-brand-700 border border-brand-500"
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
