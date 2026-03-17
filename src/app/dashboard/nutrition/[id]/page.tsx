"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  UtensilsCrossed,
  Copy,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterSelect } from "@/components/ui/filter-select";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { Food } from "@/types";

interface MealPlanDetail {
  id: string;
  name: string;
  description: string | null;
  isTemplate: boolean;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  createdAt: string;
  meals: {
    id: string;
    name: string;
    description: string | null;
    time: string | null;
    foods: Food[];
    orderIndex: number;
  }[];
  assignedTo: {
    id: string;
    client: { id: string; name: string; status: string };
    isActive: boolean;
  }[];
}

interface ClientOption {
  id: string;
  name: string;
}

export default function MealPlanDetailPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<MealPlanDetail>(`/api/meal-plans/${params.id}`),
      api.get<ClientOption[]>("/api/clients"),
    ])
      .then(([p, c]) => {
        setPlan(p);
        setClients(c);
      })
      .catch(() => router.push("/dashboard/nutrition"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const copy = await api.post<{ id: string }>(`/api/meal-plans/${params.id}/duplicate`);
      router.push(`/dashboard/nutrition/${copy.id}`);
    } catch {
      toast.error(t.errors.somethingWentWrong);
    }
    setDuplicating(false);
  }

  async function confirmDelete() {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/meal-plans/${params.id}`);
    } catch (err: any) {
      if (err?.status !== 404) {
        toast.error(err?.message || t.errors.somethingWentWrong);
        setDeleteLoading(false);
        return;
      }
    }
    router.push("/dashboard/nutrition");
  }

  async function handleAssign() {
    if (!assignClientId) return;
    try {
      await api.post("/api/meal-plans/assign", {
        mealPlanId: params.id,
        clientId: assignClientId,
      });
      const updated = await api.get<MealPlanDetail>(`/api/meal-plans/${params.id}`);
      setPlan(updated);
      setShowAssign(false);
      setAssignClientId("");
    } catch {
      toast.error(t.errors.somethingWentWrong);
    }
  }

  if (loading || !plan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const assignedIds = new Set(plan.assignedTo.map((a) => a.client.id));
  const availableClients = clients.filter((c) => !assignedIds.has(c.id));

  return (
    <div>
      <Link
        href="/dashboard/nutrition"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.nutrition.backToNutrition}
      </Link>

      <div className="mt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{plan.name}</h1>
          {plan.isTemplate && (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
              {t.nutrition.template}
            </span>
          )}
        </div>
        {plan.description && (
          <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
        )}

        {/* Macro summary */}
        {plan.targetCalories && (
          <div className="mt-3 flex flex-wrap gap-3">
            <span className="rounded bg-orange-50 px-2.5 py-1 text-sm font-medium text-orange-700">
              {plan.targetCalories} cal
            </span>
            {plan.targetProtein && (
              <span className="rounded bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700">
                P: {plan.targetProtein}g
              </span>
            )}
            {plan.targetCarbs && (
              <span className="rounded bg-green-50 px-2.5 py-1 text-sm font-medium text-green-700">
                C: {plan.targetCarbs}g
              </span>
            )}
            {plan.targetFat && (
              <span className="rounded bg-yellow-50 px-2.5 py-1 text-sm font-medium text-yellow-700">
                F: {plan.targetFat}g
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleDuplicate}
            disabled={duplicating}
            className="text-sm"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            {duplicating ? t.workouts.duplicating : t.workouts.duplicate}
          </Button>
          <Button variant="outline" asChild className="text-sm">
            <Link href={`/dashboard/nutrition?plan=${plan.id}`}>
              <Pencil className="mr-1.5 h-4 w-4" />
              {t.common.edit}
            </Link>
          </Button>
          <Button
            onClick={() => setShowAssign(true)}
            className="text-sm"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            {t.nutrition.assignMealPlan}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm !text-red-600 hover:!bg-red-50"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t.common.delete}
          </Button>
        </div>
      </div>

      {/* Meals */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          {t.nutrition.meals_count ? `${plan.meals.length} ${t.nutrition.meals_count}` : `${plan.meals.length} meals`}
        </h2>
        <div className="mt-4 space-y-3">
          {plan.meals.map((meal) => (
            <div key={meal.id} className="card">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">{meal.name}</p>
                {meal.time && (
                  <span className="text-sm text-gray-400">{meal.time}</span>
                )}
              </div>
              {meal.description && (
                <p className="mt-0.5 text-sm text-gray-500 italic">{meal.description}</p>
              )}
              <div className="mt-2 space-y-1">
                {(meal.foods as Food[])?.map((food, fi) => (
                  <div key={fi} className="flex justify-between text-sm text-gray-600">
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
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Clients */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t.workouts.assignedClients} ({plan.assignedTo.length})
          </h2>
        </div>
        {plan.assignedTo.length === 0 ? (
          <div className="card mt-4 flex flex-col items-center py-8 text-center">
            <Users className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {t.workouts.notAssigned}
            </p>
            {availableClients.length > 0 && (
              <Button onClick={() => setShowAssign(true)} className="mt-4">
                <UserPlus className="mr-2 h-4 w-4" />
                {t.nutrition.assignMealPlan}
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {plan.assignedTo.map((a) => (
              <Link
                key={a.id}
                href={`/dashboard/clients/${a.client.id}`}
                className="card flex items-center gap-3 transition-shadow hover:shadow-md"
              >
                <Avatar name={a.client.name} size="sm" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {a.client.name}
                  </p>
                </div>
                <StatusBadge status={a.isActive ? "active" : "inactive"} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={t.workouts.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={deleteLoading}
        destructive
      />

      {/* Assign Modal */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t.nutrition.assignMealPlan}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <FilterSelect
              value={assignClientId}
              onChange={setAssignClientId}
              placeholder={t.nutrition.selectClient || t.workouts.selectClient}
              options={availableClients.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Button
              onClick={handleAssign}
              disabled={!assignClientId}
              className="w-full"
            >
              {t.workouts.assign}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
