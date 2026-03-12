"use client";

import { useState, useMemo, useEffect } from "react";
import {
  UtensilsCrossed,
  Plus,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TemplatePickerModal } from "./template-picker-modal";
import { MealPlanForm, emptyForm, mealsToPayload, planToFormState, type FormState } from "./meal-plan-form";
import { MealPlanCard } from "./meal-plan-card";
import type { AssignedMealPlan, MealInput } from "@/types";
import { toast } from "sonner";
import { useLocale } from "@/lib/i18n";
import { api } from "@/lib/api";
import { computeMealTotals } from "@/lib/portion-scaling";

interface ClientNutritionTabProps {
  clientId: string;
  assignedMealPlans: AssignedMealPlan[];
  onRefresh: () => void;
}

export function ClientNutritionTab({ clientId, assignedMealPlans, onRefresh }: ClientNutritionTabProps) {

  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(
    assignedMealPlans.length > 0 ? assignedMealPlans[0].id : null
  );
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Unified form state for both create and edit
  const [form, setForm] = useState<FormState>(emptyForm(t));

  const totals = useMemo(() => computeMealTotals(form.meals), [form.meals]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      calories: totals.calories ? totals.calories.toString() : "",
      protein: totals.protein ? totals.protein.toString() : "",
      carbs: totals.carbs ? totals.carbs.toString() : "",
      fat: totals.fat ? totals.fat.toString() : "",
    }));
  }, [totals]);

  function updateFormField(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function setMeals(meals: MealInput[]) {
    setForm((f) => ({ ...f, meals }));
  }

  async function handleAssignTemplate(templateId: string, _mode?: string, aiAdjust?: boolean) {
    try {
      await api.post(`/api/clients/${clientId}/nutrition`, {
        mealPlanId: templateId,
        aiAdjust: aiAdjust ?? false,
        locale,
      });
      toast.success(t.nutrition.mealPlanAssigned);
    } catch {
      toast.error(t.nutrition.failedToAssign);
    }
    setShowTemplatePicker(false);
    onRefresh();
  }

  async function handleCreateCustom(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/api/clients/${clientId}/nutrition`, {
        name: form.name,
        targetCalories: form.calories ? parseInt(form.calories) : null,
        targetProtein: form.protein ? parseInt(form.protein) : null,
        targetCarbs: form.carbs ? parseInt(form.carbs) : null,
        targetFat: form.fat ? parseInt(form.fat) : null,
        meals: mealsToPayload(form.meals),
      });
      toast.success(t.nutrition.customMealPlanCreated);
      setShowCustomForm(false);
      setForm(emptyForm(t));
      onRefresh();
    } catch {
      toast.error(t.nutrition.failedToCreate);
    }
    setSaving(false);
  }

  function startEdit(plan: AssignedMealPlan) {
    setEditingPlanId(plan.id);
    setForm(planToFormState(plan));
  }

  async function handleSaveEdit(planId: string) {
    setSaving(true);
    try {
      await api.put(`/api/clients/${clientId}/nutrition/${planId}`, {
        customName: form.name,
        targetCalories: form.calories ? parseInt(form.calories) : null,
        targetProtein: form.protein ? parseInt(form.protein) : null,
        targetCarbs: form.carbs ? parseInt(form.carbs) : null,
        targetFat: form.fat ? parseInt(form.fat) : null,
        meals: mealsToPayload(form.meals),
      });
      toast.success(t.nutrition.mealPlanSaved);
      setEditingPlanId(null);
      onRefresh();
    } catch {
      toast.error(t.nutrition.failedToSave);
    }
    setSaving(false);
  }

  async function handleDelete(planId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/nutrition/${planId}`);
      toast.success(t.nutrition.mealPlanRemoved);
      onRefresh();
    } catch {
      toast.error(t.nutrition.failedToRemove);
    }
  }

  async function handleToggleActive(planId: string, currentlyActive: boolean) {
    try {
      await api.put(`/api/clients/${clientId}/nutrition/${planId}`, {
        isActive: !currentlyActive,
      });
      onRefresh();
    } catch {
      toast.error(t.nutrition.failedToSave);
    }
  }

  async function handleToggleDownload(planId: string, currentlyAllowed: boolean) {
    try {
      await api.put(`/api/clients/${clientId}/nutrition/${planId}`, {
        allowDownload: !currentlyAllowed,
      });
      onRefresh();
    } catch {
      toast.error(t.nutrition.failedToSave);
    }
  }

  if (assignedMealPlans.length === 0 && !showCustomForm) {
    return (
      <div>
        <div className="card flex flex-col items-center py-8 text-center">
          <UtensilsCrossed className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.nutrition.noPlansAssigned}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => setShowTemplatePicker(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              {t.nutrition.assignFromTemplate}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomForm(true);
                setForm(emptyForm(t));
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.nutrition.createCustomPlanBtn}
            </Button>
          </div>
        </div>
        {showTemplatePicker && (
          <TemplatePickerModal type="nutrition" onSelect={handleAssignTemplate} onClose={() => setShowTemplatePicker(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.nutrition.mealPlans} ({assignedMealPlans.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplatePicker(true)} className="text-sm">
            <FileDown className="mr-1 h-4 w-4" />
            {t.nutrition.fromTemplate}
          </Button>
          <Button
            onClick={() => {
              setShowCustomForm(true);
              setForm(emptyForm(t));
            }}
            className="text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t.nutrition.customPlanLabel}
          </Button>
        </div>
      </div>

      {/* Custom Plan Form */}
      {showCustomForm && (
        <MealPlanForm
          mode="create"
          form={form}
          setForm={setForm}
          updateFormField={updateFormField}
          setMeals={setMeals}
          saving={saving}
          onSubmit={handleCreateCustom}
          onClose={() => setShowCustomForm(false)}
          t={t}
        />
      )}

      {/* Plan Cards */}
      <div className="space-y-3">
        {assignedMealPlans.map((plan) => (
          <MealPlanCard
            key={plan.id}
            plan={plan}
            isOpen={expanded === plan.id}
            isEditing={editingPlanId === plan.id}
            form={form}
            setForm={setForm}
            updateFormField={updateFormField}
            setMeals={setMeals}
            saving={saving}
            onToggle={() => setExpanded(expanded === plan.id ? null : plan.id)}
            onStartEdit={() => startEdit(plan)}
            onSaveEdit={() => handleSaveEdit(plan.id)}
            onCancelEdit={() => setEditingPlanId(null)}
            onDelete={() => handleDelete(plan.id)}
            onToggleActive={() => handleToggleActive(plan.id, plan.isActive)}
            onToggleDownload={() => handleToggleDownload(plan.id, plan.allowDownload)}
            t={t}
          />
        ))}
      </div>

      {showTemplatePicker && (
        <TemplatePickerModal type="nutrition" onSelect={handleAssignTemplate} onClose={() => setShowTemplatePicker(false)} />
      )}
    </div>
  );
}
