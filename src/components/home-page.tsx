import Link from "next/link";
import {
  Dumbbell,
  Users,
  Calendar,
  Camera,
  ArrowRight,
  Utensils,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Client Management",
    desc: "Organize profiles, track goals, manage your entire client roster from one place.",
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-500",
  },
  {
    icon: Calendar,
    title: "Scheduling",
    desc: "Book sessions, manage your calendar, send reminders, and reduce no-shows.",
    color: "from-purple-500/20 to-purple-600/5",
    iconColor: "text-purple-500",
  },
  {
    icon: Dumbbell,
    title: "Workout Plans",
    desc: "Build custom programs with exercises, sets, and reps. Assign to clients in one click.",
    color: "from-brand-400/20 to-brand-500/5",
    iconColor: "text-brand-400",
  },
  {
    icon: Utensils,
    title: "Nutrition Tracking",
    desc: "Create meal plans, track macros, and search from thousands of foods.",
    color: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-400",
  },
  {
    icon: Camera,
    title: "Progress Photos",
    desc: "Track client transformations with organized before/after photo galleries.",
    color: "from-pink-500/20 to-pink-600/5",
    iconColor: "text-pink-400",
  },
  {
    icon: MessageSquare,
    title: "Messaging",
    desc: "Real-time chat with clients. Keep all communication in one thread.",
    color: "from-cyan-500/20 to-cyan-600/5",
    iconColor: "text-cyan-400",
  },
];

const highlights = [
  "Unlimited clients",
  "Custom branding",
  "AI-powered plans",
  "Multi-language support",
  "Real-time messaging",
  "Progress tracking",
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <header className="relative z-10 border-b border-white/5">
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
            <Link
              href="/register"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-400"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 md:pt-32">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/15 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/4 rounded-full bg-brand-500/8 blur-[100px] animate-pulse-glow [animation-delay:1s]" />
          <div className="bg-dot-pattern absolute inset-0 opacity-30" />
        </div>

        <div className="relative mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-400/20 bg-brand-400/10 px-4 py-1.5 text-sm text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            AI-empowered coaching platform
          </div>

          <h1 className="font-[family-name:var(--font-heading)] text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
            Your coaching business,{" "}
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
              simplified.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            Workout plans. Nutrition tracking. Client management. Scheduling.
            Messaging. All in one platform built for personal trainers.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="inline-flex items-center rounded-xl bg-brand-500 px-8 py-3 text-base font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/40"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              Already have an account?
            </Link>
          </div>

          {/* Highlight pills */}
          <div className="mx-auto mt-12 flex max-w-xl flex-wrap items-center justify-center gap-2">
            {highlights.map((h) => (
              <span
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/5 px-3 py-1 text-xs text-slate-400"
              >
                <CheckCircle2 className="h-3 w-3 text-brand-400" />
                {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-white/5 px-6 py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/80 to-slate-950" />
        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
              Features
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-4xl">
              Everything you need to run your business
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-400">
              Stop juggling spreadsheets, notes, and messaging apps. One
              platform for your entire coaching workflow.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-6 transition-all duration-300 hover:border-white/10 hover:bg-slate-800/60"
              >
                <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                    <feature.icon className={`h-5 w-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats — uncomment when we have real data
      <section className="border-t border-white/5 px-6 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 md:grid-cols-4">
          {[
            { value: "500+", label: "Active coaches" },
            { value: "10k+", label: "Clients managed" },
            { value: "50k+", label: "Workouts created" },
            { value: "4.9", label: "Average rating" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-[family-name:var(--font-heading)] text-3xl font-bold text-white md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
      */}

      {/* How it works */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-400">
              How it works
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-4xl">
              Up and running in minutes
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Shield,
                title: "Create your account",
                desc: "Sign up free and set up your coaching profile with your branding, services, and availability.",
              },
              {
                step: "02",
                icon: Users,
                title: "Add your clients",
                desc: "Invite existing clients or accept new ones through your public landing page.",
              },
              {
                step: "03",
                icon: BarChart3,
                title: "Grow your business",
                desc: "Create programs, track progress, manage payments, and communicate — all from one place.",
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <span className="font-[family-name:var(--font-heading)] text-5xl font-bold text-white/5">
                  {item.step}
                </span>
                <div className="mx-auto -mt-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-400/20">
                  <item.icon className="h-5 w-5 text-brand-400" />
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-heading)] font-semibold">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 px-6 py-24">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-16 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-brand-500/15 blur-[80px] animate-pulse-glow" />
            <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-purple-500/10 blur-[80px] animate-pulse-glow [animation-delay:1s]" />
          </div>
          <div className="relative">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight md:text-4xl">
              Ready to streamline your coaching?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-400">
              Free to get started. No credit card required. Set up your profile
              and start managing clients today.
            </p>
            <div className="mt-8">
              <Link
                href="/register"
                className="inline-flex items-center rounded-xl bg-brand-500 px-8 py-3 text-base font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-500/40"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
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
