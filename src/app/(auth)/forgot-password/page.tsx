"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const t = useT();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setErrorMsg("Too many requests. Please try again later.");
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950 px-4">
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
          <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{t.auth.forgotPasswordTitle}</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            {t.auth.forgotPasswordSubtitle}
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.04] dark:bg-brand-500/[0.07] blur-2xl" />
          <div className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-4 shadow-sm backdrop-blur-md space-y-4 md:p-6">

            {status === "sent" ? (
              <div className="rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400">
                {t.auth.resetLinkSent}
              </div>
            ) : (
              <>
                {status === "error" && errorMsg && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                      {t.auth.email}
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

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 disabled:opacity-50"
                  >
                    {status === "submitting" ? t.auth.sendingResetLink : t.auth.sendResetLink}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-slate-500">
          <a
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
          >
            {t.auth.backToLogin}
          </a>
        </p>
      </div>
    </div>
  );
}
