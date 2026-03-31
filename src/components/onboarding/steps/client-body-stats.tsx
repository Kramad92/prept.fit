"use client";

import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/filter-select";
import type { StepProps } from "../onboarding-wizard";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export function ClientBodyStats({ data, onUpdate }: StepProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-card-foreground">Body Stats</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        All fields are optional. You can update these anytime from your profile.
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-card-foreground">
              Gender
            </label>
            <FilterSelect
              options={GENDER_OPTIONS}
              value={data.gender || ""}
              onChange={(v) => onUpdate({ gender: v })}
              placeholder="Select"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-card-foreground">
              Date of Birth
            </label>
            <Input
              type="date"
              value={data.dateOfBirth || ""}
              onChange={(e) => onUpdate({ dateOfBirth: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-card-foreground">
              Height (cm)
            </label>
            <Input
              type="number"
              value={data.height || ""}
              onChange={(e) => onUpdate({ height: e.target.value })}
              placeholder="175"
              min={100}
              max={250}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-card-foreground">
              Current Weight (kg)
            </label>
            <Input
              type="number"
              value={data.weight || ""}
              onChange={(e) => onUpdate({ weight: e.target.value })}
              placeholder="75"
              min={20}
              max={300}
              step={0.1}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This will be saved as your first measurement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
