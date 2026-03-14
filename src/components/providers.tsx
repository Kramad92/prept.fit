"use client";

import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <I18nProvider>
        {children}
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            className: "text-sm",
            duration: 3000,
          }}
        />
      </I18nProvider>
    </SessionProvider>
  );
}
