"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { useT } from "@/lib/i18n";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {t.auth.createAccountTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.auth.startManaging}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.yourName} *
            </label>
            <input
              type="text"
              name="name"
              required
              className="input mt-1"
              placeholder="Ime Prezime"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.businessName} *
            </label>
            <input
              type="text"
              name="businessName"
              required
              className="input mt-1"
              placeholder="FitLife Coaching"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.email} *
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="input mt-1"
              placeholder="vas@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.password} *
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input mt-1"
              placeholder={t.auth.minChars}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.confirmPassword} *
            </label>
            <input
              type="password"
              name="confirmPassword"
              required
              autoComplete="new-password"
              className="input mt-1"
              placeholder={t.auth.reenterPassword}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? t.auth.creatingAccount : t.auth.createAccount}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t.auth.alreadyHaveAccount}{" "}
          <a
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {t.common.signIn}
          </a>
        </p>
      </div>
    </div>
  );
}
