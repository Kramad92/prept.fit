"use client";

import { useSession } from "next-auth/react";
import { MessageThread } from "@/components/chat/message-thread";
import { useT } from "@/lib/i18n";

export default function PortalMessagesPage() {
  const t = useT();
  const { data: session } = useSession();

  if (!session?.user?.clientProfileId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 6rem)" }}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-3">
          <h1 className="text-sm font-semibold text-gray-900">
            {t.messages.title}
          </h1>
          <p className="text-xs text-gray-500">{t.portalMessages.chatWithCoach}</p>
        </div>

        <MessageThread
          clientId={session.user.clientProfileId}
          currentUserId={session.user.id}
          tenantId={session.user.tenantId}
        />
      </div>
    </div>
  );
}
