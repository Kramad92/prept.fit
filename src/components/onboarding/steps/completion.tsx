"use client";

import { CheckCircle2, Users, Dumbbell, UtensilsCrossed, Calendar } from "lucide-react";
import Link from "next/link";

interface CompletionProps {
  role: "coach" | "client";
}

const COACH_FEATURES = [
  { icon: Users, label: "Manage Clients", href: "/dashboard/clients", color: "text-blue-600 bg-blue-50" },
  { icon: Dumbbell, label: "Workout Plans", href: "/dashboard/workouts", color: "text-purple-600 bg-purple-50" },
  { icon: UtensilsCrossed, label: "Nutrition Plans", href: "/dashboard/nutrition", color: "text-orange-600 bg-orange-50" },
  { icon: Calendar, label: "Schedule", href: "/dashboard/schedule", color: "text-green-600 bg-green-50" },
];

const CLIENT_FEATURES = [
  { icon: Dumbbell, label: "My Workouts", href: "/portal/workouts", color: "text-purple-600 bg-purple-50" },
  { icon: UtensilsCrossed, label: "Nutrition", href: "/portal/nutrition", color: "text-orange-600 bg-orange-50" },
  { icon: Calendar, label: "Book Session", href: "/portal/book", color: "text-blue-600 bg-blue-50" },
  { icon: Users, label: "Messages", href: "/portal/messages", color: "text-green-600 bg-green-50" },
];

export function Completion({ role }: CompletionProps) {
  const features = role === "coach" ? COACH_FEATURES : CLIENT_FEATURES;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-gray-900">
        You&apos;re All Set!
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        {role === "coach"
          ? "Your coaching platform is ready. Here are some key areas to explore:"
          : "Your profile is set up. Here's what you can do:"}
      </p>

      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        {features.map((feature) => (
          <div
            key={feature.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}>
              <feature.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-gray-700">{feature.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
