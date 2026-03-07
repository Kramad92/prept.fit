"use client";

import {
  UtensilsCrossed,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Pencil,
  UserPlus,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Food, MealPlanSummary } from "@/types";

interface NutritionPlanCardProps {
  plan: MealPlanSummary;
  isExpanded: boolean;
  planDetail: any;
  duplicating: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAssign: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NutritionPlanCard({
  plan,
  isExpanded,
  planDetail,
  duplicating,
  onToggleExpand,
  onEdit,
  onDuplicate,
  onAssign,
  onDelete,
}: NutritionPlanCardProps) {
  const t = useT();

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onToggleExpand(plan.id)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
            <UtensilsCrossed className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{plan.name}</h3>
              {plan.isTemplate && (
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  {t.nutrition.template}
                </span>
              )}
            </div>
            <div className="flex gap-3 text-xs text-gray-500">
              {plan.targetCalories && <span>{plan.targetCalories} cal</span>}
              <span>{plan.mealCount} {t.nutrition.meals_count}</span>
              <span>{plan.assignedCount} {t.workouts.clients_count}</span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(plan.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={t.common.edit}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDuplicate(plan.id)}
            disabled={duplicating}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title={t.workouts.duplicate}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAssign(plan.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600"
            title={t.workouts.assignToClient}
          >
            <UserPlus className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(plan.id)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            title={t.common.delete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && planDetail && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {plan.targetCalories && (
            <div className="flex gap-4 text-sm">
              <span className="rounded bg-orange-50 px-2 py-0.5 text-orange-700">
                {plan.targetCalories} cal
              </span>
              {plan.targetProtein && (
                <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">
                  P: {plan.targetProtein}g
                </span>
              )}
              {plan.targetCarbs && (
                <span className="rounded bg-green-50 px-2 py-0.5 text-green-700">
                  C: {plan.targetCarbs}g
                </span>
              )}
              {plan.targetFat && (
                <span className="rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">
                  F: {plan.targetFat}g
                </span>
              )}
            </div>
          )}
          {planDetail.meals?.map((meal: any) => (
            <div key={meal.id} className="rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{meal.name}</p>
                {meal.time && (
                  <span className="text-xs text-gray-400">{meal.time}</span>
                )}
              </div>
              {(meal.foods as Food[])?.map((food: any, fi: number) => (
                <div key={fi} className="mt-1 flex justify-between text-sm text-gray-600">
                  <span>
                    {food.name}
                    {food.portion && ` — ${food.portion}`}
                  </span>
                  {food.calories && (
                    <span className="text-xs text-gray-400">
                      {food.calories} cal
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {planDetail.assignedTo?.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-500">{t.nutrition.assignedTo}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {planDetail.assignedTo.map((a: any) => (
                  <span key={a.id} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {a.client.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
