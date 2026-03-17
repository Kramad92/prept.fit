"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  UsersRound,
  Dumbbell,
  CalendarRange,
  Library,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  UtensilsCrossed,
  DollarSign,
  Settings,
  LogOut,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT } from "@/lib/i18n";

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();
  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "/" }));
  };

  const navSections = [
    {
      items: [
        { href: "/dashboard", icon: LayoutDashboard, label: t.nav.dashboard },
        { href: "/dashboard/clients", icon: Users, label: t.nav.clients },
        { href: "/dashboard/schedule", icon: Calendar, label: t.nav.schedule },
        { href: "/dashboard/messages", icon: MessageSquare, label: t.nav.messages },
        { href: "/dashboard/check-ins", icon: ClipboardCheck, label: t.nav.checkIns },
      ],
    },
    {
      label: t.nav.programs ?? "Programs",
      items: [
        { href: "/dashboard/workouts", icon: Dumbbell, label: t.nav.workouts },
        { href: "/dashboard/nutrition", icon: UtensilsCrossed, label: t.nav.nutrition },
        { href: "/dashboard/programs", icon: CalendarRange, label: t.nav.programs },
        { href: "/dashboard/exercises", icon: Library, label: t.nav.exerciseLibrary },
      ],
    },
    {
      label: t.common.more ?? "More",
      items: [
        { href: "/dashboard/group-training", icon: UsersRound, label: t.nav.groupTraining },
        { href: "/dashboard/habits", icon: Sparkles, label: t.nav.habits },
        { href: "/dashboard/billing", icon: DollarSign, label: t.nav.billing },
        { href: "/dashboard/settings", icon: Settings, label: t.nav.settings },
      ],
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <img src="/logo.png" alt="Prept" className="h-8" />
          <span className="text-lg font-bold text-gray-900">Prept</span>
        </div>

        <div className="px-3 pt-3">
          <button
            onClick={openSearch}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">{t.common.search}...</span>
            <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 lg:inline-block">
              /
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          {navSections.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-400">{t.common.theme}</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5" />
            {t.common.signOut}
          </button>
        </div>
      </div>
    </aside>
  );
}
