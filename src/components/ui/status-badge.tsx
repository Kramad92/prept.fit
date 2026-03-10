"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  paused: "bg-yellow-100 text-yellow-700",
  archived: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  "no-show": "bg-orange-100 text-orange-700",
  enrolled: "bg-blue-100 text-blue-700",
  attended: "bg-green-100 text-green-700",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useT();
  const statusLabels: Record<string, string> = {
    active: t.statuses.active,
    inactive: t.statuses.inactive,
    paused: t.statuses.paused,
    paid: t.statuses.paid,
    pending: t.statuses.pending,
    overdue: t.statuses.overdue,
    cancelled: t.statuses.cancelled,
    confirmed: t.statuses.confirmed,
    completed: t.statuses.completed,
    enrolled: t.groupTraining.enrolled,
    attended: t.groupTraining.attended,
    archived: t.statuses.archived,
    "no-show": t.groupTraining.noShow,
    scheduled: t.groupTraining.scheduled,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] || "bg-gray-100 text-gray-600",
        className
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}
