"use client";

import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import type { StepProps } from "../onboarding-wizard";

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little or no exercise)" },
  { value: "light", label: "Lightly Active (1-3 days/week)" },
  { value: "moderate", label: "Moderately Active (3-5 days/week)" },
  { value: "active", label: "Active (6-7 days/week)" },
  { value: "very_active", label: "Very Active (twice per day)" },
];

export function ClientProfile({ data, onUpdate }: StepProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">About You</h2>
      <p className="mt-1 text-sm text-gray-500">
        Tell your coach about your goals and current fitness level.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            What are your fitness goals?
          </label>
          <Textarea
            value={data.goals || ""}
            onChange={(e) => onUpdate({ goals: e.target.value })}
            placeholder="e.g., Lose 10kg, build muscle, improve endurance, train for a marathon..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Fitness Level
            </label>
            <FilterSelect
              options={FITNESS_LEVELS}
              value={data.fitnessLevel || ""}
              onChange={(v) => onUpdate({ fitnessLevel: v })}
              placeholder="Select level"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Activity Level
            </label>
            <FilterSelect
              options={ACTIVITY_LEVELS}
              value={data.activityLevel || ""}
              onChange={(v) => onUpdate({ activityLevel: v })}
              placeholder="Select level"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
