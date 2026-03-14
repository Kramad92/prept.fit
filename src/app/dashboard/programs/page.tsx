"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CalendarRange, UtensilsCrossed, Search, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { WorkoutProgramSummary, NutritionProgramSummary } from "@/types";

export default function ProgramsPage() {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState<"workout" | "nutrition">("workout");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<"workout" | "nutrition">("workout");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { data: programs, loading, refresh } = useApi<WorkoutProgramSummary[]>("/api/programs");
  const { data: nutritionPrograms, loading: nLoading, refresh: nRefresh } = useApi<NutritionProgramSummary[]>("/api/nutrition-programs");

  function handleDeleteWorkout(id: string) {
    setDeletingId(id);
    setDeletingType("workout");
  }

  function handleDeleteNutrition(id: string) {
    setDeletingId(id);
    setDeletingType("nutrition");
  }

  async function confirmDelete() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      if (deletingType === "workout") {
        await api.delete(`/api/programs/${deletingId}`);
        refresh();
      } else {
        await api.delete(`/api/nutrition-programs/${deletingId}`);
        nRefresh();
      }
    } catch (err: any) {
      if (err?.status !== 404) {
        toast.error(err?.message || t.errors.somethingWentWrong);
      }
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  }

  const filteredWorkouts = (programs || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredNutrition = (nutritionPrograms || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading || nLoading) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.programs.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.programs.subtitle}</p>
        </div>
        <Button asChild>
          <Link href={tab === "workout" ? "/dashboard/programs/new" : "/dashboard/programs/nutrition/new"}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">
              {tab === "workout" ? t.programs.newProgram : t.programs.newNutritionProgram}
            </span>
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => { setTab("workout"); setSearch(""); }}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "workout"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.programs.workoutTab}
        </button>
        <button
          onClick={() => { setTab("nutrition"); setSearch(""); }}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "nutrition"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t.programs.nutritionTab}
        </button>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={t.programs.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {tab === "workout" && (
        <>
          {filteredWorkouts.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={CalendarRange}
                title={t.programs.noPrograms}
                description={t.programs.noProgramsDesc}
                action={
                  <Button asChild>
                    <Link href="/dashboard/programs/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {t.programs.createProgram}
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 stagger-in">
              {filteredWorkouts.map((prog) => (
                <div key={prog.id} className="card">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/programs/${prog.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                        <CalendarRange className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900">{prog.name}</h3>
                        {prog.description && (
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                            {prog.description}
                          </p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>{prog.durationWeeks} {t.programs.weeks}</span>
                          <span>{prog.daysPerWeek} {t.programs.daysWeek}</span>
                          <span>{prog.dayCount} {t.programs.workoutsCount}</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {prog.assignedCount}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/programs/${prog.id}/edit`)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={t.common.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkout(prog.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "nutrition" && (
        <>
          {filteredNutrition.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={UtensilsCrossed}
                title={t.programs.noNutritionPrograms}
                description={t.programs.noNutritionProgramsDesc}
                action={
                  <Button asChild>
                    <Link href="/dashboard/programs/nutrition/new">
                      <Plus className="mr-2 h-4 w-4" />
                      {t.programs.newNutritionProgram}
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 stagger-in">
              {filteredNutrition.map((prog) => (
                <div key={prog.id} className="card">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/programs/nutrition/${prog.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50">
                        <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-gray-900">{prog.name}</h3>
                        {prog.description && (
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                            {prog.description}
                          </p>
                        )}
                        <div className="flex gap-3 text-xs text-gray-500">
                          <span>{prog.durationWeeks} {t.programs.weeks}</span>
                          <span>{prog.mealsPerDay} {t.programs.mealsPerDay}</span>
                          <span>{prog.dayCount} {t.programs.mealPlansCount}</span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {prog.assignedCount}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/programs/nutrition/${prog.id}/edit`)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title={t.common.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteNutrition(prog.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        title={t.programs.deleteConfirm}
        confirmLabel={t.common.delete}
        cancelLabel={t.common.cancel}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
}
