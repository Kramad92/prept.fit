"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t.auth.registrationFailed);
        setLoading(false);
        return;
      }

      // Account created — now sign in with the OAuth provider
      // This time the signIn callback will find the user and succeed
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setError(t.auth.registrationFailed);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="Prept" className="mx-auto h-12" />
          <h2 className="mt-2 text-xl font-bold text-gray-900">Prept</h2>
          <h2 className="mt-3 text-xl font-semibold text-gray-900">
            {t.auth.completeRegistration}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t.auth.oneMoreStep}
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
              value={email}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.yourName} *
            </label>
            <Input
              type="text"
              name="name"
              required
              defaultValue={name}
              className="mt-1"
              placeholder="Ime Prezime"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.auth.businessName} *
            </label>
            <Input
              type="text"
              name="businessName"
              required
              className="mt-1"
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
