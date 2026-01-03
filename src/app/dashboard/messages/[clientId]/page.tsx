"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MessageThread } from "@/components/chat/message-thread";

export default function ChatPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.clientId}`)
      .then((r) => r.json())
      .then((data) => setClientName(data.name))
      .catch(() => {});
  }, [params.clientId]);

  if (!session) return null;

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <Link
          href="/dashboard/messages"
          className="rounded-lg p-1 hover:bg-gray-100 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {clientName || "Loading..."}
          </h1>
          <p className="text-xs text-gray-500">Direct message</p>
        </div>
      </div>

      <MessageThread
        clientId={params.clientId as string}
        currentUserId={session.user.id}
      />
    </div>
  );
}
