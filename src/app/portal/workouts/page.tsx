"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Play,
  Users,
  CalendarRange,
  CheckCircle2,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ExpandableNotes } from "@/components/ui/expandable-notes";
import { useT } from "@/lib/i18n";
import type { Exercise } from "@/types";

interface AssignedPlan {
  id: string;
  customName: string | null;
  mode: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  accessPolicy: string;
  clientWorkoutProgramId: string | null;
  workoutPlan: {
    id: string;
    name: string;
    description: string | null;
    exercises: Exercise[];
  };
  clientExercises: Exercise[];
}

interface ProgramDay {
  id: string;
  weekNumber: number;
  dayNumber: number;
  label: string | null;
  workoutPlan: { id: string; name: string; description: string | null } | null;
}

interface AssignedProgram {
  id: string;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  currentWeek: number;
  currentDay: number;
  program: {
    id: string;
    name: string;
    description: string | null;
    durationWeeks: number;
    daysPerWeek: number;
    days: ProgramDay[];
  };
  clientWorkoutPlans: AssignedPlan[];
}

export default function PortalWorkoutsPage() {
  const t = useT();
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [programs, setPrograms] = useState<AssignedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((data) => {
        // Standalone plans (not part of a program)
        const standalone = (data.assignedPlans || []).filter(
          (p: AssignedPlan) => !p.clientWorkoutProgramId
        );
        setPlans(standalone);
        setPrograms(data.assignedPrograms || []);
        if (data.assignedPrograms?.length > 0) {
          setExpandedProgram(data.assignedPrograms[0].id);
        } else if (standalone.length > 0) {
          setExpanded(standalone[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const hasContent = plans.length > 0 || programs.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {t.portalWorkouts.title}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.portalWorkouts.subtitle}
      </p>

      {!hasContent ? (
        <div className="mt-8">
          <EmptyState
            icon={Dumbbell}
            title={t.portalWorkouts.noPlans}
            description={t.portalWorkouts.noPlansDesc}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Programs */}
          {programs.map((prog) => {
            const isOpen = expandedProgram === prog.id;
            // Group days by week
            const weekGroups: Record<number, ProgramDay[]> = {};
            for (const d of prog.program.days) {
              if (!weekGroups[d.weekNumber]) weekGroups[d.weekNumber] = [];
              weekGroups[d.weekNumber].push(d);
            }

            // Calculate progress
            const totalWorkouts = prog.clientWorkoutPlans.length;
            const now = new Date();
            const startDate = new Date(prog.startDate);
            const currentWeekNum = Math.max(
              1,
              Math.ceil(
                (now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
              )
            );

            return (
              <div key={prog.id} className="card">
                <button
                  onClick={() =>
                    setExpandedProgram(isOpen ? null : prog.id)
                  }
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                      <CalendarRange className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">
                        {prog.program.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {prog.program.durationWeeks} {t.programs.weeks} &middot;{" "}
                        {totalWorkouts} {t.programs.workoutsCount} &middot;{" "}
                        {t.programs.week} {Math.min(currentWeekNum, prog.program.durationWeeks)}
                      </p>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    {prog.program.description && (
                      <ExpandableNotes
                        notes={prog.program.description}
                        className="text-sm text-gray-500"
                      />
                    )}

                    {Object.entries(weekGroups).map(([weekStr, weekDays]) => {
                      const week = Number(weekStr);
                      const isCurrent = week === Math.min(currentWeekNum, prog.program.durationWeeks);
                      return (
                        <div key={weekStr}>
                          <h4
                            className={`text-sm font-semibold ${isCurrent ? "text-brand-700" : "text-gray-600"}`}
                          >
                            {t.programs.week} {week}
                            {isCurrent && " (current)"}
                          </h4>
                          <div className="mt-1 space-y-1">
                            {weekDays.map((day) => {
                              // Find the matching client workout plan for this day
                              const matchingPlan = prog.clientWorkoutPlans.find(
                                (cwp) =>
                                  cwp.workoutPlan.name === day.workoutPlan?.name
                              );

                              return (
                                <div
                                  key={day.id}
                                  className="flex items-center gap-2 rounded-lg bg-gray-50 p-2"
                                >
                                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                    {day.dayNumber}
                                  </span>
                                  <span className="flex-1 text-sm text-gray-700">
                                    {day.label || day.workoutPlan?.name || t.programs.restDay}
                                  </span>
                                  {matchingPlan && matchingPlan.mode !== "live" && (
                                    <Link
                                      href={`/portal/workouts/${matchingPlan.workoutPlan.id}/log`}
                                      className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                                    >
                                      <Play className="mr-1 inline h-3 w-3" />
                                      {t.portalWorkouts.startWorkout}
                                    </Link>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Standalone Workout Plans */}
          {plans.length > 0 && programs.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-900">
              Individual Workouts
            </h2>
          )}
          {plans.map((plan) => {
            const isOpen = expanded === plan.id;
            const exercises =
              plan.clientExercises?.length > 0
                ? plan.clientExercises
                : plan.workoutPlan.exercises;
            const displayName = plan.customName || plan.workoutPlan.name;

            return (
              <div key={plan.id} className="card">
                <button
                  onClick={() => setExpanded(isOpen ? null : plan.id)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                      <Dumbbell className="h-5 w-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {displayName}
                        </h3>
                        {plan.mode === "live" && (
                          <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">
                            <Users className="h-3 w-3" />
                            {t.portalWorkouts.withCoach}
                          </span>
                        )}
                      </div>
                      {plan.workoutPlan.description && (
                        <ExpandableNotes
                          notes={plan.workoutPlan.description}
                          className="text-sm text-gray-500"
                        />
                      )}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                    {exercises.map((ex, i) => (
                      <div
                        key={ex.id}
                        className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                      >
                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{ex.name}</p>
                          <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                            {ex.sets && (
                              <span>
                                {ex.sets} {t.portalWorkouts.sets}
                              </span>
                            )}
                            {ex.reps && (
                              <span>
                                {ex.reps} {t.portalWorkouts.reps}
                              </span>
                            )}
                            {ex.weight && <span>{ex.weight}</span>}
                            {ex.restSeconds && (
                              <span>
                                {ex.restSeconds}s {t.portalWorkouts.rest}
                              </span>
                            )}
                          </div>
                          {ex.notes && <ExpandableNotes notes={ex.notes} />}
                        </div>
                      </div>
                    ))}

                    {plan.mode === "live" ? (
                      <div className="mt-4 rounded-lg bg-purple-50 p-3 text-center text-sm text-purple-700">
                        <Users className="mr-1.5 inline h-4 w-4" />
                        {t.portalWorkouts.liveWithCoach}
                      </div>
                    ) : (
                      <Link
                        href={`/portal/workouts/${plan.workoutPlan.id}/log`}
                        className="btn-primary mt-4 w-full"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {t.portalWorkouts.startWorkout}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
