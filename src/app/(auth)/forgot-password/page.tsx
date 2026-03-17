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
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/3 blur-[100px]" />
        <div className="bg-dot-pattern absolute inset-0 opacity-10" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
          <h2 className="mt-2 text-xl font-bold text-gray-900">{t.auth.forgotPasswordTitle}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t.auth.forgotPasswordSubtitle}
          </p>
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.04] blur-2xl" />
          <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm backdrop-blur-md space-y-4 md:p-6">

            {status === "sent" ? (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {t.auth.resetLinkSent}
              </div>
            ) : (
              <>
                {status === "error" && errorMsg && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t.auth.email}
                    </label>
                    <Input
                      type="email"
                      name="email"
                      required
                      autoComplete="email"
                      className="mt-1"
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

        <p className="mt-4 text-center text-sm text-gray-500">
          <a
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-500"
          >
            {t.auth.backToLogin}
          </a>
        </p>
      </div>
    </div>
  );
}
