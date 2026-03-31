"use client";

import { SessionProvider } from "next-auth/react";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="w-full max-w-2xl">
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
