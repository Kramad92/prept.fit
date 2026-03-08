"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useLocale, getDateLocale } from "@/lib/i18n";
import { StatusBadge } from "@/components/ui/status-badge";
import type { GroupSession } from "@/types";

interface SessionCardProps {
  session: GroupSession;
  href: string;
  showParticipantCount?: boolean;
  participantLabel?: string;
}

export function SessionCard({ session, href, showParticipantCount = true, participantLabel }: SessionCardProps) {
  const { locale } = useLocale();

  return (
    <Link href={href} className="card flex items-center justify-between transition-shadow hover:shadow-md">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">{session.title}</h3>
          {session.isOpen && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Open</span>
          )}
          <StatusBadge status={session.status} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
          <span>
            {new Date(session.date).toLocaleDateString(getDateLocale(locale), {
              month: "short", day: "numeric",
            })}
            {" "}{session.startTime}–{session.endTime}
          </span>
          {session.group && <span className="text-brand-600">{session.group.name}</span>}
          {session.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{session.location}
            </span>
          )}
        </div>
      </div>
      {showParticipantCount && session._count && (
        <div className="text-right text-sm">
          <span className="font-medium text-gray-900">
            {session._count.participants}/{session.maxParticipants}
          </span>
          {participantLabel && <p className="text-xs text-gray-500">{participantLabel}</p>}
        </div>
      )}
    </Link>
  );
}
