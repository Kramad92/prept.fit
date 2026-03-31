"use client";

import { Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepProps } from "../onboarding-wizard";

export function CoachWelcome({ onNext }: StepProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
        <Dumbbell className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-gray-900">
        Welcome to Prept!
      </h2>
      <p className="mt-3 max-w-md text-sm text-gray-500">
        Let&apos;s get your coaching platform ready. We&apos;ll set up your profile,
        customize your brand, and help you create your first workout — all in under 5 minutes.
      </p>
      <Button onClick={onNext} className="mt-8" size="lg">
        Get Started
      </Button>
    </div>
  );
}
