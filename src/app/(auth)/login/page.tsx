"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const t = useT();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        result.error === "PORTAL_DISABLED"
          ? t.auth.portalDisabled
          : t.auth.invalidCredentials
      );
    } else {
      // Redirect based on role
      const session = await getSession();
      if (session?.user?.role === "CLIENT") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
          <h2 className="mt-2 text-xl font-bold text-gray-900">Prept</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t.auth.signInTitle}
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

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.password}
            </label>
            <Input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1"
              placeholder={t.auth.enterPassword}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? t.auth.signingIn : t.auth.signInButton}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          {t.auth.dontHaveAccount}{" "}
          <a
            href="/register"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {t.auth.getStarted}
          </a>
        </p>
      </div>
    </div>
  );
}
