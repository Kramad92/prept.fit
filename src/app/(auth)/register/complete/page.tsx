"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export default function CompleteRegistrationPage() {
  return (
    <Suspense>
      <CompleteRegistrationContent />
    </Suspense>
  );
}

function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useT();

  const provider = searchParams.get("provider") || "";
  const email = searchParams.get("email") || "";
  const name = searchParams.get("name") || "";

  // If no provider/email, they shouldn't be here
  if (!provider || !email) {
    router.push("/register");
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const businessName = formData.get("businessName") as string;
    const finalName = formData.get("name") as string;

    try {
      const res = await fetch("/api/auth/register/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: finalName,
          businessName,
          provider,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t.auth.registrationFailed);
        setLoading(false);
        return;
      }

      // Sign in directly using the one-time token (no second Google popup)
      const result = await signIn("credentials", {
        email,
        password: data.loginToken,
        redirect: false,
      });

      if (result?.error) {
        setError(t.auth.registrationFailed);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError(t.auth.registrationFailed);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
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

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
          <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">Prept</h2>
          <h2 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
            {t.auth.completeRegistration}
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t.auth.oneMoreStep}
          </p>
        </div>

        <div className="relative">
        <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.04] dark:bg-brand-500/[0.07] blur-2xl" />
        <form onSubmit={handleSubmit} className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-4 shadow-sm backdrop-blur-md space-y-4 md:p-6">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.email}
            </label>
            <Input
              type="email"
              value={email}
              disabled
              className="mt-1 bg-gray-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
              {t.auth.yourName} *
            </label>
            <Input
              type="text"
              name="name"
              required
              defaultValue={name}
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? t.auth.creatingAccount : t.auth.createAccount}
          </Button>
        </form>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-500">
          {t.auth.alreadyHaveAccount}{" "}
          <a
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {t.common.signIn}
          </a>
        </p>
      </div>
    </div>
  );
}
