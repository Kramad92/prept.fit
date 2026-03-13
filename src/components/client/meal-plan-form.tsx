"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FoodPicker } from "./food-picker";
import { AIGenerateMealPlan } from "@/components/ai/ai-generate-meal-plan";
import type { MealInput, Food, AssignedMealPlan } from "@/types";
import { scalePortionFoodInput } from "@/lib/portion-scaling";

export interface FormState {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  meals: MealInput[];
}

export function emptyForm(t: any): FormState {
  return {
    name: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    meals: [
      { tempId: "b", name: "", description: "", time: "07:30", foods: [] },
      { tempId: "l", name: "", description: "", time: "12:30", foods: [] },
      { tempId: "d", name: "", description: "", time: "19:00", foods: [] },
    ],
  };
}

export function mealsToPayload(meals: MealInput[]) {
  return meals
    .filter((m) => m.name.trim())
    .map((m, i) => ({
      name: m.name,
      description: m.description || null,
      time: m.time || null,
      foods: m.foods.filter((f) => f.name.trim()).map((f) => ({
        name: f.name,
        portion: f.portion,
        calories: f.calories ? parseInt(f.calories) : null,
        protein: f.protein ? parseInt(f.protein) : null,
        carbs: f.carbs ? parseInt(f.carbs) : null,
        fat: f.fat ? parseInt(f.fat) : null,
      })),
      orderIndex: i,
    }));
}

export function planToFormState(plan: AssignedMealPlan): FormState {
  const source = plan.clientMeals.length > 0 ? plan.clientMeals : plan.mealPlan.meals;
  return {
    name: plan.customName || plan.mealPlan.name,
    calories: plan.mealPlan.targetCalories?.toString() || "",
    protein: plan.mealPlan.targetProtein?.toString() || "",
    carbs: plan.mealPlan.targetCarbs?.toString() || "",
    fat: plan.mealPlan.targetFat?.toString() || "",
    meals: source.map((m) => ({
      tempId: m.id,
      name: m.name,
      description: (m as any).description || "",
      time: m.time || "",
      foods: (m.foods as Food[]).map((f: any) => ({
        name: f.name || "",
        portion: f.portion || "",
        calories: f.calories?.toString() || "",
        protein: f.protein?.toString() || "",
        carbs: f.carbs?.toString() || "",
        fat: f.fat?.toString() || "",
      })),
    })),
  };
}

interface MealEditorProps {
  meals: MealInput[];
  setMeals: (meals: MealInput[]) => void;
  t: any;
}

function MealEditor({ meals, setMeals, t }: MealEditorProps) {
  const portionBeforeEdit = useRef<{ mi: number; fi: number; portion: string } | null>(null);

  function updateFood(mealIdx: number, foodIdx: number, field: string, value: string) {
    setMeals(
      meals.map((m, mi) => {
        if (mi !== mealIdx) return m;
        return {
          ...m,
          foods: m.foods.map((f, fi) => {
            if (fi !== foodIdx) return f;
            if (field === "portion") {
              // Just update text — scaling happens on blur
              return { ...f, portion: value };
            }
            return { ...f, [field]: value };
          }),
        };
      })
    );
  }

  function handlePortionFocus(mi: number, fi: number, currentPortion: string) {
    portionBeforeEdit.current = { mi, fi, portion: currentPortion };
  }

  function handlePortionBlur(mi: number, fi: number) {
    const saved = portionBeforeEdit.current;
    if (!saved || saved.mi !== mi || saved.fi !== fi) return;
    portionBeforeEdit.current = null;

    setMeals(
      meals.map((m, mIdx) =>
        mIdx === mi
          ? {
              ...m,
              foods: m.foods.map((f, fIdx) => {
                if (fIdx !== fi) return f;
                if (f.portion === saved.portion) return f;
                const scaled = scalePortionFoodInput(
                  { ...f, portion: saved.portion },
                  f.portion
                );
                return { ...f, ...scaled };
              }),
            }
          : m
      )
    );
  }

  return (
    <div className="space-y-3">
      {meals.map((meal, mi) => (
        <div key={meal.tempId} className="rounded-lg border border-gray-200 p-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="text"
                value={meal.name}
                onChange={(e) => setMeals(meals.map((m, i) => (i === mi ? { ...m, name: e.target.value } : m)))}
                placeholder={t.nutrition.mealNamePlaceholder}
              />
            </div>
            <div className="w-24">
              <Input
                type="time"
                value={meal.time}
                onChange={(e) => setMeals(meals.map((m, i) => (i === mi ? { ...m, time: e.target.value } : m)))}
              />
            </div>
            {meals.length > 1 && (
              <button
                type="button"
                onClick={() => setMeals(meals.filter((_, i) => i !== mi))}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <Textarea
            value={meal.description}
            onChange={(e) => {
              setMeals(meals.map((m, i) => (i === mi ? { ...m, description: e.target.value } : m)));
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 4.5 * 16) + "px";
            }}
            ref={(el) => {
              if (el && meal.description) {
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 4.5 * 16) + "px";
              }
            }}
            className="mt-2 text-xs resize-none overflow-hidden"
            rows={1}
            placeholder={t.nutrition.mealDescriptionPlaceholder}
          />
          <div className="mt-2 space-y-1">
            {meal.foods.length > 0 && (
              <div className="grid grid-cols-6 gap-2 px-0.5">
                <div className="col-span-2 text-[10px] font-medium text-gray-400">{t.nutrition.foodName}</div>
                <div className="text-[10px] font-medium text-gray-400">{t.nutrition.portion}</div>
                <div className="text-[10px] font-medium text-gray-400">{t.nutrition.calories}</div>
                <div className="text-[10px] font-medium text-gray-400">{t.nutrition.protein}</div>
                <div className="text-[10px] font-medium text-gray-400">{t.nutrition.fat}</div>
              </div>
            )}
            {meal.foods.map((food, fi) => (
              <div key={fi} className="grid grid-cols-6 gap-2">
                <div className="col-span-2">
                  <FoodPicker
                    variant="inline"
                    inputClassName="text-xs"
                    placeholder="Food"
                    initialValue={food.name}
                    onSelect={(result) => {
                      setMeals(
                        meals.map((m, i) =>
                          i === mi
                            ? {
                                ...m,
                                foods: m.foods.map((f, idx) =>
                                  idx === fi
                                    ? {
                                        name: result.name,
                                        portion: result.portion || f.portion,
                                        calories: result.calories?.toString() || f.calories,
                                        protein: result.protein?.toString() || f.protein,
                                        carbs: result.carbs?.toString() || f.carbs,
                                        fat: result.fat?.toString() || f.fat,
                                        unitLabel: result.unitLabel ?? f.unitLabel,
                                        gramsPerUnit: result.gramsPerUnit ?? f.gramsPerUnit,
                                      }
                                    : f
                                ),
                              }
                            : m
                        )
                      );
                    }}
                  />
                </div>
                <Input type="text" value={food.portion} onChange={(e) => updateFood(mi, fi, "portion", e.target.value)} onFocus={(e) => { handlePortionFocus(mi, fi, food.portion); e.target.select(); }} onBlur={() => handlePortionBlur(mi, fi)} className="text-xs" placeholder="Portion" />
                <Input type="number" value={food.calories} onChange={(e) => updateFood(mi, fi, "calories", e.target.value)} className="text-xs" placeholder="Cal" />
                <Input type="number" value={food.protein} onChange={(e) => updateFood(mi, fi, "protein", e.target.value)} className="text-xs" placeholder="P" />
                <div className="flex gap-1">
                  <Input type="number" value={food.fat} onChange={(e) => updateFood(mi, fi, "fat", e.target.value)} className="text-xs" placeholder="F" />
                  <button type="button" onClick={() => {
                    setMeals(meals.map((m, i) => i === mi ? { ...m, foods: m.foods.filter((_, idx) => idx !== fi) } : m));
                  }} className="text-gray-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
            <FoodPicker
              variant="inline"
              inputClassName="text-xs"
              placeholder={t.nutrition.addFoodItem}
              onSelect={(food) => {
                setMeals(
                  meals.map((m, i) =>
                    i === mi
                      ? {
                          ...m,
                          foods: [
                            ...m.foods,
                            {
                              name: food.name,
                              portion: food.portion || "",
                              calories: food.calories?.toString() || "",
                              protein: food.protein?.toString() || "",
                              carbs: food.carbs?.toString() || "",
                              fat: food.fat?.toString() || "",
                              unitLabel: food.unitLabel,
                              gramsPerUnit: food.gramsPerUnit,
                            },
                          ],
                        }
                      : m
                  )
                );
              }}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setMeals([...meals, { tempId: Math.random().toString(36).slice(2), name: "", description: "", time: "", foods: [] }])}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-brand-300 hover:text-brand-600"
      >
        <Plus className="h-4 w-4" />
        {t.nutrition.addMeal}
      </button>
    </div>
  );
}

interface MacroFieldsProps {
  form: FormState;
  updateFormField: (field: keyof FormState, value: string) => void;
  t: any;
}

function MacroFields({ form, updateFormField, t }: MacroFieldsProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div><label className="text-xs text-gray-500">{t.nutrition.calories}</label><Input type="number" value={form.calories} onChange={(e) => updateFormField("calories", e.target.value)} className="mt-0.5" placeholder="1800" /></div>
      <div><label className="text-xs text-gray-500">{t.nutrition.protein}</label><Input type="number" value={form.protein} onChange={(e) => updateFormField("protein", e.target.value)} className="mt-0.5" placeholder="150" /></div>
      <div><label className="text-xs text-gray-500">{t.nutrition.carbs}</label><Input type="number" value={form.carbs} onChange={(e) => updateFormField("carbs", e.target.value)} className="mt-0.5" placeholder="180" /></div>
      <div><label className="text-xs text-gray-500">{t.nutrition.fat}</label><Input type="number" value={form.fat} onChange={(e) => updateFormField("fat", e.target.value)} className="mt-0.5" placeholder="60" /></div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MealPlanForm — used for both "create custom" and "edit" modes     */
/* ------------------------------------------------------------------ */

interface MealPlanFormCreateProps {
  mode: "create";
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  updateFormField: (field: keyof FormState, value: string) => void;
  setMeals: (meals: MealInput[]) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  t: any;
}

interface MealPlanFormEditProps {
  mode: "edit";
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  updateFormField: (field: keyof FormState, value: string) => void;
  setMeals: (meals: MealInput[]) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  t: any;
}

export type MealPlanFormProps = MealPlanFormCreateProps | MealPlanFormEditProps;

export function MealPlanForm(props: MealPlanFormProps) {
  const { mode, form, setForm, updateFormField, setMeals, saving, t } = props;

  if (mode === "create") {
    const { onSubmit, onClose } = props as MealPlanFormCreateProps;
    return <CreateForm form={form} setForm={setForm} updateFormField={updateFormField} setMeals={setMeals} saving={saving} onSubmit={onSubmit} onClose={onClose} t={t} />;
  }

  const { onSave, onCancel } = props as MealPlanFormEditProps;
  return <EditForm form={form} updateFormField={updateFormField} setMeals={setMeals} saving={saving} onSave={onSave} onCancel={onCancel} t={t} />;
}

/* --------------- Create Form --------------- */

interface CreateFormInternalProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  updateFormField: (field: keyof FormState, value: string) => void;
  setMeals: (meals: MealInput[]) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  t: any;
}

function CreateForm({ form, setForm, updateFormField, setMeals, saving, onSubmit, onClose, t }: CreateFormInternalProps) {
  const [customDescription, setCustomDescription] = useState("");
  const [aiDescription, setAiDescription] = useState("");

  return (
    <div className="card mb-4 border-2 border-orange-200">
      <form onSubmit={(e) => { if (aiDescription) updateFormField("description" as keyof FormState, aiDescription); onSubmit(e); }}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">{t.nutrition.newCustomMealPlan}</h4>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">
          <Input type="text" required value={form.name} onChange={(e) => updateFormField("name", e.target.value)} placeholder={t.nutrition.planName} />
        </div>
        <div className="mt-2">
          <label className="text-xs text-gray-500">{aiDescription ? (t.common.aiPromptLabel || "AI Prompt") : t.common.description}</label>
          <Input
            type="text"
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder={t.nutrition.aiPromptPlaceholder}
            className="text-sm mt-0.5"
          />
          <div className="mt-1.5">
            <AIGenerateMealPlan
              prompt={customDescription}
              onGenerate={(data) => {
                setAiDescription(data.description || "");
                setForm({
                  name: form.name || data.name || form.name,
                  calories: data.targetCalories,
                  protein: data.targetProtein,
                  carbs: data.targetCarbs,
                  fat: data.targetFat,
                  meals: data.meals.map((m) => ({
                    tempId: Math.random().toString(36).slice(2),
                    name: m.name,
                    description: (m as any).description || "",
                    time: m.time || "",
                    foods: m.foods.map((f) => ({
                      name: f.name,
                      portion: f.portion || "100g",
                      calories: f.calories?.toString() || "",
                      protein: f.protein?.toString() || "",
                      carbs: f.carbs?.toString() || "",
                      fat: f.fat?.toString() || "",
                    })),
                  })),
                });
              }}
            />
          </div>
          {aiDescription && (
            <div className="mt-1.5">
              <label className="text-xs text-gray-500">{t.common.clientDescription || "Client description"}</label>
              <Input type="text" value={aiDescription} onChange={(e) => setAiDescription(e.target.value)} className="text-sm mt-0.5" />
            </div>
          )}
        </div>
        <div className="mt-3">
          <MacroFields form={form} updateFormField={updateFormField} t={t} />
        </div>
        <div className="mt-3">
          <MealEditor meals={form.meals} setMeals={setMeals} t={t} />
        </div>
        <Button type="submit" disabled={saving} className="mt-4 w-full">
          {saving ? t.nutrition.creating : t.nutrition.createMealPlan}
        </Button>
      </form>
    </div>
  );
}

/* --------------- Edit Form --------------- */

interface EditFormInternalProps {
  form: FormState;
  updateFormField: (field: keyof FormState, value: string) => void;
  setMeals: (meals: MealInput[]) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  t: any;
}

function EditForm({ form, updateFormField, setMeals, saving, onSave, onCancel, t }: EditFormInternalProps) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <div className="mb-3">
        <label className="text-xs text-gray-500">{t.nutrition.planName}</label>
        <Input type="text" value={form.name} onChange={(e) => updateFormField("name", e.target.value)} className="mt-0.5" />
      </div>
      <div className="mb-3">
        <MacroFields form={form} updateFormField={updateFormField} t={t} />
      </div>
      <MealEditor meals={form.meals} setMeals={setMeals} t={t} />
      <div className="mt-4 flex gap-2">
        <Button onClick={onSave} disabled={saving} className="text-sm">
          <Check className="mr-1 h-4 w-4" />
          {saving ? t.common.saving : t.workouts.saveChanges}
        </Button>
        <Button variant="outline" onClick={onCancel} className="text-sm">{t.common.cancel}</Button>
      </div>
    </div>
  );
}
