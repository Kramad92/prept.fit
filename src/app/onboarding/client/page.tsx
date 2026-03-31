"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ClientWelcome } from "@/components/onboarding/steps/client-welcome";
import { ClientProfile } from "@/components/onboarding/steps/client-profile";
import { ClientHealth } from "@/components/onboarding/steps/client-health";
import { ClientBodyStats } from "@/components/onboarding/steps/client-body-stats";
import { Completion } from "@/components/onboarding/steps/completion";
import type { StepProps } from "@/components/onboarding/onboarding-wizard";

function ClientCompletion(props: StepProps) {
  return <Completion role="client" />;
}

const STEPS = [
  { id: "welcome", label: "Welcome", component: ClientWelcome },
  { id: "profile", label: "About You", component: ClientProfile },
  { id: "health", label: "Health", component: ClientHealth },
  { id: "stats", label: "Body Stats", component: ClientBodyStats },
  { id: "done", label: "Done", component: ClientCompletion },
];

async function saveClientData(data: Record<string, any>) {
  const { goals, fitnessLevel, activityLevel, injuries, allergies, dietaryPrefs, gender, dateOfBirth, height, weight } = data;

  const hasData = goals || fitnessLevel || activityLevel || injuries || allergies || dietaryPrefs || gender || dateOfBirth || height || weight;
  if (!hasData) return;

  await fetch("/api/onboarding/client", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals, fitnessLevel, activityLevel, injuries, allergies, dietaryPrefs, gender, dateOfBirth, height, weight }),
  });
}

export default function ClientOnboardingPage() {
  return (
    <OnboardingWizard
      steps={STEPS}
      onSave={saveClientData}
      redirectTo="/portal"
    />
  );
}
