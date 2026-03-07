"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { MessageThread } from "@/components/chat/message-thread";
import { useT } from "@/lib/i18n";

export default function ChatPage() {
  const t = useT();
  const params = useParams();
  const { data: session } = useSession();
  const [clientName, setClientName] = useState("");
  const [clientAvatar, setClientAvatar] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${params.clientId}`)
      .then((r) => r.json())
      .then((data) => {
        setClientName(data.name);
        setClientAvatar(data.avatar || null);
      })
      .catch(() => {});
  }, [params.clientId]);

  if (!session) return null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 6rem)" }}>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Link
              href="/dashboard/messages"
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Avatar name={clientName || "?"} src={clientAvatar} />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {clientName || t.common.loading}
              </p>
              <p className="text-xs text-gray-500">{t.messages.directMessage}</p>
            </div>
          </div>

          <MessageThread
            clientId={params.clientId as string}
            currentUserId={session.user.id}
            tenantId={session.user.tenantId}
          />
        </div>
      </div>
    </div>
  );
}
