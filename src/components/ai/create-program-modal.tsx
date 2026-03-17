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
import { api } from "@/lib/api";

interface BlueprintPlan {
  name: string;
  prompt: string;
}

interface BlueprintDay {
  weekNumber: number;
  dayNumber: number;
  label: string;
  planIndex: number;
}

interface Blueprint {
  name: string;
  description: string;
  plans: BlueprintPlan[];
  schedule: BlueprintDay[];
}

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
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  function handleTypeChange(newType: "workout" | "nutrition") {
    setType(newType);
    if (newType === "workout" && daysPerWeek > 7) setDaysPerWeek(3);
  }

  // ---- "Use existing" mode: single server call ----
  async function handleExisting() {
    setProgress(t.programs.generating || "Generating...");

    const res = await fetch("/api/ai/generate-full-program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, prompt: prompt.trim(), source: "existing", durationWeeks, daysPerWeek, locale }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate program");
    }
    const result = await res.json();

    toast.success(t.programs.programCreated || "Program created");
    return result.programId;
  }

  // ---- "Generate new" mode: client-side orchestration ----
  async function handleGenerateNew() {
    // Step 1: Get blueprint
    setProgress(t.programs.designingProgram || "Designing program structure...");

    const blueprintRes = await fetch("/api/ai/generate-full-program", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, prompt: prompt.trim(), source: "generate", durationWeeks, daysPerWeek, locale }),
    });
    if (!blueprintRes.ok) {
      const data = await blueprintRes.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate program blueprint");
    }
    const { blueprint } = await blueprintRes.json() as { blueprint: Blueprint };

    // Step 2: Generate and save each plan individually
    const planIds: string[] = [];
    const totalPlans = blueprint.plans.length;

    for (let i = 0; i < totalPlans; i++) {
      // Space out AI calls to avoid hitting free-tier rate limits across providers
      if (i > 0) {
        const waitSec = 10;
        for (let s = waitSec; s > 0; s--) {
          setProgress(`${t.programs.rateLimitWait || "Waiting before next generation"} (${s}s)… (${i + 1}/${totalPlans})`);
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      const plan = blueprint.plans[i];
      setProgress(`${t.programs.generatingPlan || "Generating"} ${plan.name}... (${i + 1}/${totalPlans})`);

      if (type === "workout") {
        // Generate workout plan via existing endpoint
        const genRes = await fetch("/api/ai/generate-workout-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Create a workout plan: ${plan.name}. ${plan.prompt}`,
            locale,
          }),
        });
        if (!genRes.ok) {
          const data = await genRes.json().catch(() => ({}));
          throw new Error(data.error || `Failed to generate ${plan.name}`);
        }
        const genData = await genRes.json();

        // Save as template
        setProgress(`${t.common.saving || "Saving"} ${plan.name}... (${i + 1}/${totalPlans})`);
        const saved = await api.post<{ id: string }>("/api/workouts", {
          name: genData.name || plan.name,
          description: genData.description || null,
          isTemplate: true,
          exercises: (genData.exercises || []).map((ex: any, idx: number) => ({
            name: ex.name,
            sets: ex.sets || null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            restSeconds: ex.restSeconds || null,
            notes: ex.notes || null,
            videoUrl: ex.videoUrl || null,
            orderIndex: idx,
          })),
        });
        planIds.push(saved.id);
      } else {
        // Generate meal plan via existing endpoint
        const genRes = await fetch("/api/ai/generate-meal-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Create a meal plan: ${plan.name}. ${plan.prompt}`,
            locale,
          }),
        });
        if (!genRes.ok) {
          const data = await genRes.json().catch(() => ({}));
          throw new Error(data.error || `Failed to generate ${plan.name}`);
        }
        const genData = await genRes.json();

        // Save as template
        setProgress(`${t.common.saving || "Saving"} ${plan.name}... (${i + 1}/${totalPlans})`);
        const saved = await api.post<{ id: string }>("/api/meal-plans", {
          name: genData.name || plan.name,
          description: genData.description || null,
          isTemplate: true,
          targetCalories: genData.targetCalories || null,
          targetProtein: genData.targetProtein || null,
          targetCarbs: genData.targetCarbs || null,
          targetFat: genData.targetFat || null,
          meals: (genData.meals || []).map((meal: any, idx: number) => ({
            name: meal.name,
            description: meal.description || null,
            time: meal.time || null,
            foods: meal.foods || [],
            orderIndex: idx,
          })),
        });
        planIds.push(saved.id);
      }
    }

    // Step 3: Create the program with day mappings
    setProgress(t.programs.creatingProgram || "Creating program...");

    const days = blueprint.schedule
      .filter((d) => d.planIndex >= 0 && d.planIndex < planIds.length)
      .map((d) => ({
        weekNumber: d.weekNumber,
        dayNumber: d.dayNumber,
        label: d.label || null,
        ...(type === "workout"
          ? { workoutPlanId: planIds[d.planIndex] }
          : { mealPlanId: planIds[d.planIndex] }),
      }));

    const programEndpoint = type === "workout" ? "/api/programs" : "/api/nutrition-programs";
    const programPayload = type === "workout"
      ? { name: blueprint.name, description: blueprint.description || null, durationWeeks, daysPerWeek, days }
      : { name: blueprint.name, description: blueprint.description || null, durationWeeks, mealsPerDay: daysPerWeek, days };

    const program = await api.post<{ id: string }>(programEndpoint, programPayload);

    toast.success(
      `${t.programs.programCreated || "Program created"} (${totalPlans} ${type === "workout" ? t.programs.workoutsCount : t.programs.mealPlansCount} ${t.programs.generated || "generated"})`
    );

    return program.id;
  }

  async function handleSubmit() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");

    try {
      const programId = source === "existing"
        ? await handleExisting()
        : await handleGenerateNew();

      onClose();
      const path = type === "workout"
        ? `/dashboard/programs/${programId}`
        : `/dashboard/programs/nutrition/${programId}`;
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

          {/* Source toggle */}
          <div>
            <label className="label">{t.programs.planSource || "Plan source"}</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource("existing")}
                disabled={loading}
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
                disabled={loading}
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
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
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
