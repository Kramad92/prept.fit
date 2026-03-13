import Link from "next/link";
import {
  Dumbbell,
  Users,
  Calendar,
  Camera,
  ArrowRight,
  Utensils,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Users,
    title: "Client Management",
    desc: "Organize profiles, track goals, manage your entire client roster from one place.",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    desc: "Book sessions, manage your calendar, send reminders, and reduce no-shows.",
  },
  {
    icon: Dumbbell,
    title: "Workout Plans",
    desc: "Build custom programs with exercises, sets, and reps. Assign to clients in one click.",
  },
  {
    icon: Utensils,
    title: "Nutrition Tracking",
    desc: "Create meal plans, track macros, and search from thousands of foods.",
  },
  {
    icon: Camera,
    title: "Progress Photos",
    desc: "Track client transformations with organized before/after photo galleries.",
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    desc: "Real-time chat with clients. Keep all communication in one thread.",
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Prept" className="h-8" />
            <span className="text-lg font-bold text-white">Prept</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Button asChild className="rounded-lg">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pb-20 pt-24 md:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl">
            Your coaching business,{" "}
            <span className="text-brand-400">simplified.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            Workout plans. Nutrition tracking. Client management. Scheduling.
            Messaging. All in one platform built for personal trainers.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button asChild className="rounded-lg px-8 py-3 text-base">
              <Link href="/register">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/5 bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-3xl">
              Everything you need to run your business
            </h2>
            <p className="mt-3 text-slate-400">
              Stop juggling spreadsheets, notes, and messaging apps.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/5 bg-slate-900/80 p-6 transition-colors hover:border-brand-400/20 hover:bg-slate-800/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-400/10">
                  <feature.icon className="h-5 w-5 text-brand-400" />
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-heading)] font-semibold tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-3xl">
            Ready to streamline your coaching?
          </h2>
          <p className="mt-3 text-slate-400">
            Free to get started. No credit card required.
          </p>
          <div className="mt-8">
            <Button asChild className="rounded-lg px-8 py-3 text-base">
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto max-w-6xl text-center text-sm text-slate-500">
          Prept &mdash; Built for personal trainers.
        </div>
      </footer>
    </div>
  );
}
