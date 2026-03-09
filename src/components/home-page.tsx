import Link from "next/link";
import { Dumbbell, Users, Calendar, Camera } from "lucide-react";

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold">TrainerHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-20 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
          Your personal training business,{" "}
          <span className="text-brand-600">simplified</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-gray-500">
          Manage clients, schedule sessions, build workout plans, and track
          progress — all in one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="btn-primary px-8 py-3 text-base">
            Start Free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-bold text-gray-900">
            Everything you need to run your coaching business
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Users,
                title: "Client Management",
                desc: "Organize client profiles, track goals, and manage your entire roster.",
              },
              {
                icon: Calendar,
                title: "Scheduling",
                desc: "Book sessions, manage your calendar, and reduce no-shows.",
              },
              {
                icon: Dumbbell,
                title: "Workout Plans",
                desc: "Build custom workout plans and assign them to clients.",
              },
              {
                icon: Camera,
                title: "Progress Photos",
                desc: "Track client transformations with organized photo galleries.",
              },
            ].map((feature) => (
              <div key={feature.title} className="card text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
                  <feature.icon className="h-6 w-6 text-brand-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-8 text-center text-sm text-gray-400">
        TrainerHub &mdash; Built for personal trainers.
      </footer>
    </div>
  );
}
