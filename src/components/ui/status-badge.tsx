"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";

const statusVariants: Record<string, BadgeProps["variant"]> = {
  active: "success",
  inactive: "secondary",
  paused: "warning",
  archived: "secondary",
  scheduled: "info",
  confirmed: "info",
  completed: "success",
  cancelled: "destructive",
  paid: "success",
  pending: "warning",
  overdue: "destructive",
  "no-show": "orange",
  enrolled: "info",
  attended: "success",
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
    <Badge
      variant={statusVariants[status] || "secondary"}
      className={className}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}
