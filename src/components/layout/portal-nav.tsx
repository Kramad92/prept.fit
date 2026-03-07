"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Dumbbell,
  Camera,
  CalendarPlus,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  UtensilsCrossed,
  TrendingUp,
  CreditCard,
  LogOut,
  MoreHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useT, useLocale, type Locale } from "@/lib/i18n";

const LOCALE_LABELS: Record<Locale, string> = { bs: "BHS", sr: "SRP", hr: "HRV", en: "ENG" };

export function PortalMobileNav() {
  const pathname = usePathname();
  const t = useT();
  const { locale, setLocale } = useLocale();

  const navItems = [
    { href: "/portal", icon: Home, label: t.nav.home },
    { href: "/portal/workouts", icon: Dumbbell, label: t.nav.workouts },
    { href: "/portal/progress", icon: Camera, label: t.nav.progress },
    { href: "/portal/book", icon: CalendarPlus, label: t.nav.book },
    { href: "/portal/messages", icon: MessageSquare, label: t.nav.messages },
    { href: "/portal/check-ins", icon: ClipboardCheck, label: t.nav.checkIns },
    { href: "/portal/habits", icon: Sparkles, label: t.nav.habits },
    { href: "/portal/nutrition", icon: UtensilsCrossed, label: t.nav.nutrition },
    { href: "/portal/payments", icon: CreditCard, label: t.nav.payments },
    { href: "/portal/progress/charts", icon: TrendingUp, label: t.nav.charts },
  ];

  const primaryNav = navItems.slice(0, 4);
  const moreNav = navItems.slice(4);
  const [showMore, setShowMore] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setShowMore(false); }, [pathname]);

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
      {showMore && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" />
      )}

      <div ref={menuRef} className="md:hidden">
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

            <div className="mt-3 flex items-center justify-between border-t border-gray-100 px-3 pt-3">
              <div className="flex items-center gap-1.5">
                {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={cn(
                      "rounded px-2 py-1 text-[11px] font-medium transition-colors",
                      locale === l
                        ? "bg-brand-100 text-brand-700"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    )}
                  >
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white pb-safe">
          <div className="flex items-center justify-around">
            {primaryNav.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/");
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

export function PortalDesktopNav() {
  const pathname = usePathname();
  const t = useT();
  const { locale, setLocale } = useLocale();

  const navItems = [
    { href: "/portal", icon: Home, label: t.nav.home },
    { href: "/portal/workouts", icon: Dumbbell, label: t.nav.workouts },
    { href: "/portal/progress", icon: Camera, label: t.nav.progress },
    { href: "/portal/book", icon: CalendarPlus, label: t.nav.book },
    { href: "/portal/messages", icon: MessageSquare, label: t.nav.messages },
    { href: "/portal/check-ins", icon: ClipboardCheck, label: t.nav.checkIns },
    { href: "/portal/habits", icon: Sparkles, label: t.nav.habits },
    { href: "/portal/nutrition", icon: UtensilsCrossed, label: t.nav.nutrition },
    { href: "/portal/payments", icon: CreditCard, label: t.nav.payments },
    { href: "/portal/progress/charts", icon: TrendingUp, label: t.nav.charts },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <Dumbbell className="h-7 w-7 text-brand-600" />
          <span className="text-xl font-bold text-gray-900">{t.nav.myPortal}</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-400">{t.common.language}</span>
            <div className="flex gap-1">
              {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                    locale === l
                      ? "bg-brand-100 text-brand-700"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  )}
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
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
