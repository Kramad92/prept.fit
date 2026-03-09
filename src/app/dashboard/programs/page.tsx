"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CalendarRange, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";
import type { WorkoutProgramSummary } from "@/types";

export default function ProgramsPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const { data: programs, loading } = useApi<WorkoutProgramSummary[]>("/api/programs");

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
            <Link
              key={prog.id}
              href={`/dashboard/programs/${prog.id}`}
              className="card transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                    <CalendarRange className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{prog.name}</h3>
                    {prog.description && (
                      <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                        {prog.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-gray-500">
                <span>{prog.durationWeeks} {t.programs.weeks}</span>
                <span>{prog.daysPerWeek} {t.programs.daysWeek}</span>
                <span>{prog.dayCount} {t.programs.workoutsCount}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {prog.assignedCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
