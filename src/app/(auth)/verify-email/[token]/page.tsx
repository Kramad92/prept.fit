"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <img src="/logo.png" alt="Prept" className="mx-auto h-12 mb-4" />

        {status === "loading" && (
          <p className="text-gray-500">Validating link...</p>
        )}

        {status === "ready" && (
          <div className="card space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Verify your email</h2>
            <p className="text-sm text-gray-500">
              Hi {userName}, click below to verify your email and activate your account.
            </p>
            <Button onClick={handleVerify} className="w-full">
              Verify Email
            </Button>
          </div>
        )}

        {status === "verifying" && (
          <p className="text-gray-500">Verifying...</p>
        )}

        {status === "success" && (
          <div className="card space-y-4">
            <div className="text-4xl">&#10003;</div>
            <h2 className="text-xl font-bold text-gray-900">Email verified!</h2>
            <p className="text-sm text-gray-500">
              Redirecting to sign in...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="card space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Verification failed</h2>
            <p className="text-sm text-red-600">{error}</p>
            <a
              href="/login"
              className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Go to sign in
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
