"use client";

import { ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StepProps } from "../onboarding-wizard";

export function ClientHealth({ data, onUpdate }: StepProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-card-foreground">Health Information</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        This helps your coach create safe, personalized plans. All fields are optional.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Injuries or Limitations
          </label>
          <Textarea
            value={data.injuries || ""}
            onChange={(e) => onUpdate({ injuries: e.target.value })}
            placeholder="e.g., Lower back pain, knee surgery in 2023, shoulder impingement..."
            rows={2}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Food Allergies
          </label>
          <Input
            value={data.allergies || ""}
            onChange={(e) => onUpdate({ allergies: e.target.value })}
            placeholder="e.g., Gluten, dairy, nuts..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-card-foreground">
            Dietary Preferences
          </label>
          <Input
            value={data.dietaryPrefs || ""}
            onChange={(e) => onUpdate({ dietaryPrefs: e.target.value })}
            placeholder="e.g., Vegetarian, halal, no pork..."
          />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-lg bg-blue-500/10 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
        <p className="text-xs text-blue-400">
          This information is only visible to your coach and is used to customize your training and nutrition plans.
        </p>
      </div>
    </div>
  );
}
