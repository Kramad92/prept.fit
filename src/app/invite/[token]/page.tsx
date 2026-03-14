"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Dumbbell, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteInfo {
  clientName: string;
  email: string;
  businessName: string;
  brandColor: string;
  hasExistingAccount?: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const t = useT();

  useEffect(() => {
    fetch(`/api/invite/${params.token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setInfo(data);
        } else {
          setError(data.error);
        }
      })
      .catch(() => setError(t.invite.somethingWentWrong))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function handleLinkAccount() {
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`/api/invite/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setFormError(data.error);
      }
    } catch {
      setFormError(t.invite.somethingWentWrong);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password.length < 8) {
      setFormError(t.invite.passwordMinChars);
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t.auth.passwordsDoNotMatch);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/invite/${params.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setFormError(data.error);
      }
    } catch {
      setFormError(t.invite.somethingWentWrong);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {t.invite.inviteLinkIssue}
          </h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <a
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {t.invite.backToLogin}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {t.invite.allSet}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t.invite.redirectingToSignIn}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            {t.invite.welcome}, {info!.clientName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.invite.setupAccountFor}{" "}
            <span className="font-medium text-gray-700">
              {info!.businessName}
            </span>
          </p>
        </div>

        {info!.hasExistingAccount ? (
          <div className="card space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}
            <p className="text-sm text-gray-600">
              {t.invite.existingAccountDesc}{" "}
              <span className="font-medium text-gray-900">{info!.businessName}</span>.
            </p>
            <Button
              onClick={handleLinkAccount}
              disabled={submitting}
              className="w-full"
            >
              {submitting ? "..." : t.invite.linkAccount}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.auth.email}
              </label>
              <Input
                type="email"
                value={info!.email}
                disabled
                className="mt-1 bg-gray-50 text-gray-500"
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
                minLength={8}
                autoComplete="new-password"
                className="mt-1"
                placeholder={t.auth.minChars}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.auth.confirmPassword}
              </label>
              <Input
                type="password"
                name="confirmPassword"
                required
                autoComplete="new-password"
                className="mt-1"
                placeholder={t.auth.reenterPassword}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? t.auth.creatingAccount : t.auth.createAccount}
            </Button>
          </form>
        )}

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
