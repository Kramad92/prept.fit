"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((_, index) => (
        <div
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index < currentStep
              ? "w-6 bg-brand-500"
              : index === currentStep
                ? "w-8 bg-brand-500"
                : "w-6 bg-border"
          }`}
        />
      ))}
    </div>
  );
}
