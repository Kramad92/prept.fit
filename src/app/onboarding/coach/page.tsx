"use client";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { CoachWelcome } from "@/components/onboarding/steps/coach-welcome";
import { CoachProfile } from "@/components/onboarding/steps/coach-profile";
import { CoachBranding } from "@/components/onboarding/steps/coach-branding";
import { CoachPreferences } from "@/components/onboarding/steps/coach-preferences";
import { CoachExercises } from "@/components/onboarding/steps/coach-exercises";
import { CoachWorkout } from "@/components/onboarding/steps/coach-workout";
import { CoachInvite } from "@/components/onboarding/steps/coach-invite";
import { Completion } from "@/components/onboarding/steps/completion";
import type { StepProps } from "@/components/onboarding/onboarding-wizard";

function CoachCompletion(props: StepProps) {
  return <Completion role="coach" />;
}

const STEPS = [
  { id: "welcome", label: "Welcome", component: CoachWelcome },
  { id: "profile", label: "Profile", component: CoachProfile },
  { id: "branding", label: "Brand", component: CoachBranding },
  { id: "preferences", label: "Preferences", component: CoachPreferences },
  { id: "exercises", label: "Exercises", component: CoachExercises },
  { id: "workout", label: "Workout", component: CoachWorkout },
  { id: "invite", label: "Invite", component: CoachInvite },
  { id: "done", label: "Done", component: CoachCompletion },
];

async function saveCoachData(data: Record<string, any>) {
  const { coachPhoto, bio, logo, timezone, locale, units, currency } = data;

  const hasProfileData = coachPhoto || bio || logo || timezone || locale || units || currency;
  if (!hasProfileData) return;

  await fetch("/api/onboarding/coach", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachPhoto, bio, logo, timezone, locale, units, currency }),
  });
}

export default function CoachOnboardingPage() {
  return (
    <OnboardingWizard
      steps={STEPS}
      onSave={saveCoachData}
      redirectTo="/dashboard"
      title="Welcome to Prept!"
      subtitle="Let's set up your coaching platform"
    />
  );
}
