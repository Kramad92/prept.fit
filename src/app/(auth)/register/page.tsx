"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Dumbbell, Users, Calendar, BarChart3, MessageSquare, Sparkles } from "lucide-react";

const floatingPills = [
  { icon: Dumbbell, text: "Workouts & Nutrition", position: "left-[23%] top-[22%]", delay: "0s", anim: 0 },
  { icon: Users, text: "Clients & Messaging", position: "left-[25%] top-[48%]", delay: "1.5s", anim: 1 },
  { icon: Sparkles, text: "AI-powered plans", position: "left-[22%] top-[72%]", delay: "3s", anim: 2 },
  { icon: Calendar, text: "Scheduling & Billing", position: "right-[23%] top-[24%]", delay: "0.8s", anim: 3 },
  { icon: BarChart3, text: "Progress & Check-ins", position: "right-[25%] top-[50%]", delay: "2.2s", anim: 0 },
  { icon: MessageSquare, text: "Groups & Programs", position: "right-[22%] top-[74%]", delay: "1s", anim: 1 },
];

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name") as string,
          businessName: formData.get("businessName") as string,
          email: formData.get("email") as string,
          password,
        }),
      });

      if (res.ok) {
        router.push("/login?registered=true");
      } else {
        const data = await res.json();
        setError(data.error || t.auth.registrationFailed);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 px-4 py-12">
      {/* Theme toggle — top right */}
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 dark:bg-brand-500/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/3 dark:bg-purple-500/5 blur-[100px]" />
        <div className="bg-dot-pattern absolute inset-0 opacity-10 dark:opacity-20" />
      </div>

      {/* Floating feature pills — desktop only */}
      <div className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
        {floatingPills.map((pill) => (
          <div
            key={pill.text}
            className={`absolute ${pill.position} login-float-${pill.anim}`}
            style={{ animationDelay: pill.delay }}
          >
            <div className="flex items-center gap-3 rounded-xl border border-brand-200/30 dark:border-brand-400/10 bg-brand-50/50 dark:bg-brand-400/[0.03] px-4 py-3 shadow-sm dark:shadow-[0_0_20px_rgba(132,204,22,0.1)] backdrop-blur-sm">
              <pill.icon className="h-4 w-4 text-brand-500/60 dark:text-brand-400/60" />
              <span className="text-sm text-gray-500 dark:text-slate-400">{pill.text}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Register form */}
      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
          <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Prept</h2>
          <h2 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
            {t.auth.createAccountTitle}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t.auth.startManaging}
          </p>
        </div>

        <div className="relative">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.04] dark:bg-brand-500/[0.07] blur-2xl" />
        <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-4 shadow-sm backdrop-blur-md space-y-4 md:p-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <SocialAuthButtons mode="register" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-slate-900 px-3 text-gray-400 dark:text-slate-500">{t.auth.orContinueWith}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.yourName} *
            </label>
            <Input
              type="text"
              name="name"
              required
              className="mt-1 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              placeholder="Ime Prezime"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.businessName} *
            </label>
            <Input
              type="text"
              name="businessName"
              required
              className="mt-1 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              placeholder="FitLife Coaching"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.email} *
            </label>
            <Input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              placeholder="vas@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.password} *
            </label>
            <Input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              placeholder={t.auth.minChars}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.confirmPassword} *
            </label>
            <Input
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              className="mt-1 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
              placeholder={t.auth.reenterPassword}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 disabled:opacity-50"
          >
            {loading ? t.auth.creatingAccount : t.auth.createAccount}
          </button>
          </form>
        </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-500">
          {t.auth.alreadyHaveAccount}{" "}
          <a
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {t.common.signIn}
          </a>
        </p>
      </div>
    </div>
  );
}
