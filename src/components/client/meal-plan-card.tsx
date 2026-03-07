"use client";

import {
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Food, AssignedMealPlan, MealInput } from "@/types";
import { MealPlanForm, type FormState } from "./meal-plan-form";

interface MealPlanCardProps {
  plan: AssignedMealPlan;
  isOpen: boolean;
  isEditing: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  updateFormField: (field: keyof FormState, value: string) => void;
  setMeals: (meals: MealInput[]) => void;
  saving: boolean;
  onToggle: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  t: any;
}

export function MealPlanCard({
  plan,
  isOpen,
  isEditing,
  form,
  setForm,
  updateFormField,
  setMeals,
  saving,
  onToggle,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  t,
}: MealPlanCardProps) {
  const meals = plan.clientMeals.length > 0 ? plan.clientMeals : plan.mealPlan.meals;
  const displayName = plan.customName || plan.mealPlan.name;

  return (
    <div className="card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
            <UtensilsCrossed className="h-5 w-5 text-orange-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{displayName}</h3>
            <div className="flex gap-2 text-xs text-gray-500">
              {plan.mealPlan.sourceTemplate && (
                <span>{t.nutrition.from}: {plan.mealPlan.sourceTemplate.name}</span>
              )}
              {plan.mealPlan.targetCalories && <span>{plan.mealPlan.targetCalories} {t.nutrition.kcal}</span>}
              <span>{meals.length} {t.nutrition.meals_count}</span>
            </div>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isOpen && !isEditing && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3 flex gap-2">
            <button onClick={onStartEdit} className="btn-secondary text-xs">
              <Pencil className="mr-1 h-3 w-3" />
              {t.common.edit}
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50"
            >
              <Trash2 className="mr-1 inline h-3 w-3" />
              {t.nutrition.remove}
            </button>
          </div>

          {plan.mealPlan.targetCalories && (
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-orange-50 px-2 py-0.5 font-medium text-orange-700">
                {plan.mealPlan.targetCalories} {t.nutrition.kcal}
              </span>
              {plan.mealPlan.targetProtein && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">P: {plan.mealPlan.targetProtein}g</span>
              )}
              {plan.mealPlan.targetCarbs && (
                <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">C: {plan.mealPlan.targetCarbs}g</span>
              )}
              {plan.mealPlan.targetFat && (
                <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">F: {plan.mealPlan.targetFat}g</span>
              )}
            </div>
          )}

          <div className="space-y-2">
            {meals.map((meal) => (
              <div key={meal.id} className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{meal.name}</p>
                  {meal.time && <span className="text-xs text-gray-400">{meal.time}</span>}
                </div>
                {(meal.foods as Food[]).map((food: any, fi: number) => (
                  <div key={fi} className="mt-1 flex justify-between text-sm">
                    <span className="text-gray-700">
                      {food.name}
                      {food.portion && <span className="text-gray-400"> — {food.portion}</span>}
                    </span>
                    {food.calories && <span className="text-xs text-gray-400">{food.calories} {t.nutrition.kcal}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {isOpen && isEditing && (
        <MealPlanForm
          mode="edit"
          form={form}
          setForm={setForm}
          updateFormField={updateFormField}
          setMeals={setMeals}
          saving={saving}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          t={t}
        />
      )}
    </div>
  );
}
