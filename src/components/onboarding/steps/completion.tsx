"use client";

import { CheckCircle2, Users, Dumbbell, UtensilsCrossed, Calendar } from "lucide-react";

interface CompletionProps {
  role: "coach" | "client";
}

const COACH_FEATURES = [
  { icon: Users, label: "Manage Clients", color: "text-blue-400 bg-blue-500/10" },
  { icon: Dumbbell, label: "Workout Plans", color: "text-purple-400 bg-purple-500/10" },
  { icon: UtensilsCrossed, label: "Nutrition Plans", color: "text-orange-400 bg-orange-500/10" },
  { icon: Calendar, label: "Schedule", color: "text-green-400 bg-green-500/10" },
];

const CLIENT_FEATURES = [
  { icon: Dumbbell, label: "My Workouts", color: "text-purple-400 bg-purple-500/10" },
  { icon: UtensilsCrossed, label: "Nutrition", color: "text-orange-400 bg-orange-500/10" },
  { icon: Calendar, label: "Book Session", color: "text-blue-400 bg-blue-500/10" },
  { icon: Users, label: "Messages", color: "text-green-400 bg-green-500/10" },
];

export function Completion({ role }: CompletionProps) {
  const features = role === "coach" ? COACH_FEATURES : CLIENT_FEATURES;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
        <CheckCircle2 className="h-8 w-8 text-green-400" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-card-foreground">
        You&apos;re All Set!
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {role === "coach"
          ? "Your coaching platform is ready. Here are some key areas to explore:"
          : "Your profile is set up. Here's what you can do:"}
      </p>

      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-border p-4"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}>
              <feature.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-card-foreground">{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
