"use client";

import { useSession } from "next-auth/react";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/lib/i18n";

export function TopBar() {
  const { data: session } = useSession();
  const t = useT();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Prept" className="h-7" />
          <span className="text-base font-bold text-gray-900">Prept</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <Search className="h-5 w-5" />
          </button>
          <ThemeToggle />
          <NotificationBell />
          {session?.user && (
            <Avatar name={session.user.name} size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}
