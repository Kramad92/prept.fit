"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function VerifyEmailPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "verifying" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch(`/api/auth/verify-email/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setUserName(data.name);
          setStatus("ready");
        } else {
          const data = await res.json();
          setError(data.error || "Invalid verification link");
          setStatus("error");
        }
      })
      .catch(() => {
        setError("Something went wrong");
        setStatus("error");
      });
  }, [token]);

  async function handleVerify() {
    setStatus("verifying");
    try {
      const res = await fetch(`/api/auth/verify-email/${token}`, { method: "POST" });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 2000);
      } else {
        const data = await res.json();
        setError(data.error || "Verification failed");
        setStatus("error");
      }
    } catch {
      setError("Something went wrong");
      setStatus("error");
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

      <div className="relative w-full max-w-sm text-center">
        <img src="/logo-stacked.png" alt="Prept" className="mx-auto h-28 mb-4" />

        {status === "loading" && (
          <p className="text-gray-500 dark:text-slate-400">Validating link...</p>
        )}

        {status === "ready" && (
          <div className="card space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verify your email</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Hi {userName}, click below to verify your email and activate your account.
            </p>
            <Button onClick={handleVerify} className="w-full">
              Verify Email
            </Button>
          </div>
        )}

        {status === "verifying" && (
          <p className="text-gray-500 dark:text-slate-400">Verifying...</p>
        )}

        {status === "success" && (
          <div className="card space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email verified!</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Redirecting to sign in...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="card space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verification failed</h2>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <a
              href="/login"
              className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Go to sign in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
