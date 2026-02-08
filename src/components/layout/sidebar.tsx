"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Dumbbell,
  Library,
  MessageSquare,
  ClipboardCheck,
  Sparkles,
  UtensilsCrossed,
  DollarSign,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/clients", icon: Users, label: "Clients" },
  { href: "/dashboard/schedule", icon: Calendar, label: "Schedule" },
  { href: "/dashboard/workouts", icon: Dumbbell, label: "Workouts" },
  { href: "/dashboard/exercises", icon: Library, label: "Exercise Library" },
  { href: "/dashboard/messages", icon: MessageSquare, label: "Messages" },
  { href: "/dashboard/check-ins", icon: ClipboardCheck, label: "Check-Ins" },
  { href: "/dashboard/habits", icon: Sparkles, label: "Habits" },
  { href: "/dashboard/nutrition", icon: UtensilsCrossed, label: "Nutrition" },
  { href: "/dashboard/billing", icon: DollarSign, label: "Billing" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
          <Dumbbell className="h-7 w-7 text-brand-600" />
          <span className="text-xl font-bold text-gray-900">TrainerHub</span>
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
            <span className="text-xs text-gray-400">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
