"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "./step-indicator";

export interface StepProps {
  data: Record<string, any>;
  onUpdate: (fields: Record<string, any>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}

interface StepConfig {
  id: string;
  label: string;
  component: React.ComponentType<StepProps>;
}

interface OnboardingWizardProps {
  steps: StepConfig[];
  onSave: (data: Record<string, any>) => Promise<void>;
  redirectTo: string;
  title?: string;
  subtitle?: string;
}

export function OnboardingWizard({
  steps,
  onSave,
  redirectTo,
  title,
  subtitle,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const handleUpdate = useCallback((fields: Record<string, any>) => {
    setData((prev) => ({ ...prev, ...fields }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  async function handleComplete() {
    setSaving(true);
    try {
      await onSave(data);
    } catch {
      // save failed but still complete onboarding
    }
    // Update the JWT token directly without triggering a React re-render,
    // then hard redirect so the next page load picks up the fresh token
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    window.location.href = redirectTo;
  }

  async function handleSkip() {
    setSaving(true);
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    window.location.href = redirectTo;
  }

  const StepComponent = steps[currentStep].component;

  return (
    <div className="space-y-6">
      {/* Header */}
      {(title || subtitle) && currentStep === 0 && (
        <div className="text-center">
          {title && (
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Progress */}
      <StepIndicator
        steps={steps.map((s) => s.label)}
        currentStep={currentStep}
      />

      {/* Step Content */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
        <StepComponent
          data={data}
          onUpdate={handleUpdate}
          onNext={handleNext}
          onBack={handleBack}
          isFirst={currentStep === 0}
          isLast={currentStep === steps.length - 1}
        />

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
          <div>
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < steps.length - 1 ? (
              <Button onClick={handleNext} className="gap-1.5">
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={saving}>
                {saving ? "Finishing..." : "Finish Setup"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Skip */}
      <div className="text-center">
        <button
          onClick={handleSkip}
          disabled={saving}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Skip setup for now
        </button>
      </div>
    </div>
  );
}
