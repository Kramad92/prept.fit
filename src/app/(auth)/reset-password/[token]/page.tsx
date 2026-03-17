"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const t = useT();

  const [status, setStatus] = useState<"loading" | "ready" | "submitting" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [hasExistingPassword, setHasExistingPassword] = useState(true);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    fetch(`/api/auth/reset-password/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name);
          setHasExistingPassword(data.hasExistingPassword);
          setStatus("ready");
        } else {
          const data = await res.json();
          setError(data.error || t.auth.invalidResetLink);
          setStatus("error");
        }
      })
      .catch(() => {
        setError(t.auth.invalidResetLink);
        setStatus("error");
      });
  }, [token, t.auth.invalidResetLink]);

  function validate(): boolean {
    if (password.length < 10) {
      setValidationError("Password must be at least 10 characters");
      return false;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setValidationError("Password must contain at least one letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setValidationError("Password must contain at least one number");
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t.auth.passwordsDoNotMatch);
      return false;
    }
    setValidationError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    try {
      const res = await fetch(`/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setStatus("error");
      }
    } catch {
      setError("Something went wrong");
      setStatus("error");
    }
  }

  const title = hasExistingPassword ? t.auth.resetPasswordTitle : t.auth.setPasswordTitle;
  const subtitle = hasExistingPassword ? undefined : t.auth.setPasswordSubtitle;
  const buttonLabel = hasExistingPassword ? t.auth.resetPassword : t.auth.setPassword;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/3 blur-[100px]" />
        <div className="bg-dot-pattern absolute inset-0 opacity-10" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-brand-500/[0.04] blur-2xl" />
          <div className="relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm backdrop-blur-md space-y-4 md:p-6">

            {status === "loading" && (
              <p className="text-center text-sm text-gray-500">Validating link...</p>
            )}

            {status === "ready" && (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                  {subtitle && (
                    <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                  )}
                  {userName && (
                    <p className="mt-1 text-sm text-gray-400">Hi {userName}</p>
                  )}
                </div>

                {validationError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    {validationError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t.auth.newPassword}
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="mt-1"
                      placeholder={t.auth.enterPassword}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      {t.auth.minChars}, at least one letter and one number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t.auth.confirmNewPassword}
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="mt-1"
                      placeholder={t.auth.reenterPassword}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-400 hover:shadow-brand-500/30 disabled:opacity-50"
                  >
                    {buttonLabel}
                  </button>
                </form>
              </>
            )}

            {status === "submitting" && (
              <p className="text-center text-sm text-gray-500">{t.auth.resettingPassword}</p>
            )}

            {status === "success" && (
              <div className="text-center space-y-3">
                <div className="text-4xl text-green-600">&#10003;</div>
                <h2 className="text-xl font-bold text-gray-900">{t.auth.passwordResetSuccess}</h2>
              </div>
            )}

            {status === "error" && (
              <div className="text-center space-y-4">
                <h2 className="text-xl font-bold text-gray-900">{t.auth.invalidResetLink}</h2>
                <p className="text-sm text-red-600">{error}</p>
                <a
                  href="/login"
                  className="inline-block text-sm font-medium text-brand-600 hover:text-brand-500"
                >
                  {t.auth.backToLogin}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
