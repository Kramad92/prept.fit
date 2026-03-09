"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  UtensilsCrossed,
  MoreHorizontal,
  Calendar,
  UsersRound,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  DollarSign,
  Settings,
  CalendarRange,
  Library,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export function MobileNav() {
  const pathname = usePathname();
  const t = useT();

  const primaryNav = [
    { href: "/dashboard", icon: LayoutDashboard, label: t.nav.home },
    { href: "/dashboard/clients", icon: Users, label: t.nav.clients },
    { href: "/dashboard/workouts", icon: Dumbbell, label: t.nav.workouts },
    { href: "/dashboard/nutrition", icon: UtensilsCrossed, label: t.nav.nutrition },
  ];

  const moreNav = [
    { href: "/dashboard/schedule", icon: Calendar, label: t.nav.schedule },
    { href: "/dashboard/group-training", icon: UsersRound, label: t.nav.groupTraining },
    { href: "/dashboard/programs", icon: CalendarRange, label: t.nav.programs },
    { href: "/dashboard/exercises", icon: Library, label: t.nav.exerciseLibrary },
    { href: "/dashboard/messages", icon: MessageSquare, label: t.nav.messages },
    { href: "/dashboard/check-ins", icon: ClipboardCheck, label: t.nav.checkIns },
    { href: "/dashboard/habits", icon: Sparkles, label: t.nav.habits },
    { href: "/dashboard/billing", icon: DollarSign, label: t.nav.billing },
    { href: "/dashboard/settings", icon: Settings, label: t.nav.settings },
  ];
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    setShowMore(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!showMore) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMore]);

  const isMoreActive = moreNav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" />
      )}

      <div ref={menuRef} className="md:hidden">
        {/* Expandable "More" panel */}
        {showMore && (
          <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 animate-in rounded-t-2xl border-t border-gray-200 bg-white px-2 py-3">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {t.common.more}
              </span>
              <button
                onClick={() => setShowMore(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {moreNav.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] transition-colors",
                      isActive
                        ? "bg-brand-50 text-brand-600"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
          <div className="flex items-center justify-around">
            {primaryNav.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                    isActive
                      ? "text-brand-600"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setShowMore((v) => !v)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors",
                showMore || isMoreActive
                  ? "text-brand-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>{t.common.more}</span>
            </button>
          </div>
        </nav>
      </div>
    </>
  );
}
