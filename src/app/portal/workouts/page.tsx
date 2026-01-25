"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, ChevronDown, ChevronUp, Play } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Exercise } from "@/types";

interface AssignedPlan {
  id: string;
  customName: string | null;
  isActive: boolean;
  workoutPlan: {
    id: string;
    name: string;
    description: string | null;
    exercises: Exercise[];
  };
  clientExercises: Exercise[];
}

export default function PortalWorkoutsPage() {
  const [plans, setPlans] = useState<AssignedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((data) => {
        setPlans(data.assignedPlans || []);
        if (data.assignedPlans?.length > 0) {
          setExpanded(data.assignedPlans[0].id);
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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">My Workout Plans</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your assigned training programs
      </p>

      {plans.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Dumbbell}
            title="No workout plans yet"
            description="Your coach hasn't assigned any workout plans yet. Check back soon!"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {plans.map((plan) => {
            const isOpen = expanded === plan.id;
            // Use client exercises if available, else fall back to template exercises
            const exercises = plan.clientExercises?.length > 0
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
                      <h3 className="font-semibold text-gray-900">
                        {displayName}
                      </h3>
                      {plan.workoutPlan.description && (
                        <p className="text-sm text-gray-500">
                          {plan.workoutPlan.description}
                        </p>
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
                            {ex.sets && <span>{ex.sets} sets</span>}
                            {ex.reps && <span>{ex.reps} reps</span>}
                            {ex.weight && <span>{ex.weight}</span>}
                            {ex.restSeconds && (
                              <span>{ex.restSeconds}s rest</span>
                            )}
                          </div>
                          {ex.notes && (
                            <p className="mt-1 text-sm italic text-gray-400">
                              {ex.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    <Link
                      href={`/portal/workouts/${plan.workoutPlan.id}/log`}
                      className="btn-primary mt-4 w-full"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Start Workout
                    </Link>
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
