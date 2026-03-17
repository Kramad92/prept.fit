"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Dumbbell, Users, BarChart3, Calendar, MessageSquare, Sparkles } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const t = useT();

  const registered = searchParams.get("registered") === "true";
  // Show error from OAuth redirect (e.g. PORTAL_DISABLED)
  const oauthError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResendStatus("idle");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    setEmailInput(email);

    const result = await signIn("credentials", {
      email,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "EMAIL_NOT_VERIFIED") {
        setError(t.auth.emailNotVerified);
      } else if (result.error === "PORTAL_DISABLED") {
        setError(t.auth.portalDisabled);
      } else if (result.error === "TENANT_DEACTIVATED") {
        setError("Your account has been deactivated. Please contact support.");
      } else {
        setError(t.auth.invalidCredentials);
      }
    } else {
      // Redirect based on role
      const session = await getSession();
      if (session?.user?.role === "ADMIN") {
        router.push("/admin");
      } else if (session?.user?.role === "CLIENT") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    }
  }

  async function handleResend() {
    setResendStatus("sending");
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput }),
    });
    setResendStatus("sent");
  }

  return (
    <>
      <div className="mb-8 text-center">
        <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
        <h2 className="mt-2 text-xl font-bold text-white">Prept</h2>
        <p className="mt-1 text-sm text-slate-400">
          {t.auth.signInTitle}
        </p>
      </div>

      {registered && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">
          {t.auth.verificationEmailSent}
        </div>
      )}

      <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.07] blur-2xl" />
      <div className="relative rounded-xl border border-white/10 bg-slate-900/70 p-4 backdrop-blur-md space-y-4 md:p-6">
        {(error || oauthError === "PORTAL_DISABLED") && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            <p>{error || t.auth.portalDisabled}</p>
            {error === t.auth.emailNotVerified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendStatus !== "idle"}
                className="mt-2 font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50"
              >
                {resendStatus === "sending"
                  ? t.auth.resendingVerification
                  : resendStatus === "sent"
                    ? t.auth.resendVerificationSent
                    : t.auth.resendVerification}
              </button>
            )}
          </div>
        )}

        <SocialAuthButtons mode="login" />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-slate-900 px-3 text-slate-500">{t.auth.orContinueWith}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">
            {t.auth.email}
          </label>
          <Input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-brand-500/20"
            placeholder="vas@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">
            {t.auth.password}
          </label>
          <Input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-brand-500 focus:ring-brand-500/20"
            placeholder={t.auth.enterPassword}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 disabled:opacity-50"
        >
          {loading ? t.auth.signingIn : t.auth.signInButton}
        </button>
        </form>
      </div>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        {t.auth.dontHaveAccount}{" "}
        <a
          href="/register"
          className="font-medium text-brand-400 hover:text-brand-300"
        >
          {t.auth.getStarted}
        </a>
      </p>
    </>
  );
}

const floatingPills = [
  { icon: Dumbbell, text: "Workouts & Nutrition", position: "left-[23%] top-[22%]", delay: "0s", anim: 0 },
  { icon: Users, text: "Clients & Messaging", position: "left-[25%] top-[48%]", delay: "1.5s", anim: 1 },
  { icon: Sparkles, text: "AI-powered plans", position: "left-[22%] top-[72%]", delay: "3s", anim: 2 },
  { icon: Calendar, text: "Scheduling & Billing", position: "right-[23%] top-[24%]", delay: "0.8s", anim: 3 },
  { icon: BarChart3, text: "Progress & Check-ins", position: "right-[25%] top-[50%]", delay: "2.2s", anim: 0 },
  { icon: MessageSquare, text: "Groups & Programs", position: "right-[22%] top-[74%]", delay: "1s", anim: 1 },
];

function FloatingPills() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden overflow-hidden xl:block">
      {floatingPills.map((pill, i) => (
        <div
          key={pill.text}
          className={`absolute ${pill.position} login-float-${pill.anim}`}
          style={{ animationDelay: pill.delay }}
        >
          <div className="flex items-center gap-3 rounded-xl border border-brand-400/10 bg-brand-400/[0.03] px-4 py-3 shadow-[0_0_20px_rgba(132,204,22,0.1)] backdrop-blur-sm">
            <pill.icon className="h-4 w-4 text-brand-400/60" />
            <span className="text-sm text-slate-400">{pill.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4" style={{ colorScheme: "dark" }}>
      <style>{`html, body { background-color: rgb(2 6 23) !important; }`}</style>
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/8 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/5 blur-[100px]" />
        <div className="bg-dot-pattern absolute inset-0 opacity-20" />
      </div>

      {/* Floating feature pills — desktop only */}
      <FloatingPills />

      {/* Login form */}
      <div className="relative w-full max-w-sm">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
