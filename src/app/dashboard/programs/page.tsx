"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CalendarRange, Search, Users, Pencil, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { WorkoutProgramSummary } from "@/types";

export default function ProgramsPage() {
  const t = useT();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: programs, loading, refresh } = useApi<WorkoutProgramSummary[]>("/api/programs");

  async function handleDelete(id: string) {
    if (!confirm(t.programs.deleteConfirm)) return;
    try {
      await api.delete(`/api/programs/${id}`);
      refresh();
    } catch {
      // handled by api client
    }
  }

  const filtered = (programs || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.programs.title}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.programs.subtitle}</p>
        </div>
        <Link href="/dashboard/programs/new" className="btn-primary">
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t.programs.newProgram}</span>
        </Link>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t.programs.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarRange}
            title={t.programs.noPrograms}
            description={t.programs.noProgramsDesc}
            action={
              <Link href="/dashboard/programs/new" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                {t.programs.createProgram}
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 stagger-in">
          {filtered.map((prog) => (
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
                    onClick={() => handleDelete(prog.id)}
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
    </div>
  );
}
