"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageThread } from "@/components/chat/message-thread";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export default function MessagesPage() {
  const t = useT();
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/messages/unread").then((r) => r.json()),
      fetch("/api/messages/latest").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([clientList, unread, latest]) => {
        const convos: ConversationItem[] = clientList.map((c: any) => ({
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          status: c.status,
          unreadCount: unread[c.id] || 0,
          lastMessage: latest[c.id]?.content || null,
          lastMessageAt: latest[c.id]?.createdAt || null,
        }));
        // Sort: unread first, then by last message time
        convos.sort((a, b) => {
          if (a.unreadCount && !b.unreadCount) return -1;
          if (!a.unreadCount && b.unreadCount) return 1;
          if (a.lastMessageAt && b.lastMessageAt) {
            return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          }
          return 0;
        });
        setConversations(convos);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const selectedClient = conversations.find((c) => c.id === selectedClientId);

  if (!session) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t.messages.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.messages.subtitle}</p>
        <div className="mt-8">
          <EmptyState
            icon={MessageSquare}
            title={t.messages.noClients}
            description={t.messages.noClientsDesc}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 6rem)" }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.messages.title}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t.messages.subtitle}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Conversation list */}
        <div
          className={cn(
            "flex w-full flex-col border-r border-gray-200 md:w-80 lg:w-96",
            selectedClientId ? "hidden md:flex" : "flex"
          )}
        >
          {/* Search */}
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-lg border-0 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-gray-100"
              />
            </div>
          </div>

          {/* Client list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                  selectedClientId === client.id && "bg-brand-50 hover:bg-brand-50"
                )}
              >
                <div className="relative">
                  <Avatar name={client.name} src={client.avatar} />
                  {client.status === "ACTIVE" && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {client.name}
                    </p>
                    {client.lastMessageAt && (
                      <span className="ml-2 shrink-0 text-[11px] text-gray-400">
                        {formatRelativeTime(client.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-gray-500">
                      {client.lastMessage || "No messages yet"}
                    </p>
                    {client.unreadCount > 0 && (
                      <span className="ml-2 flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                        {client.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            selectedClientId ? "flex" : "hidden md:flex"
          )}
        >
          {selectedClientId && selectedClient ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
                <button
                  onClick={() => setSelectedClientId(null)}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:hidden"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <Avatar name={selectedClient.name} src={selectedClient.avatar} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {selectedClient.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.messages.directMessage}</p>
                </div>
              </div>

              <MessageThread
                key={selectedClientId}
                clientId={selectedClientId}
                currentUserId={session.user.id}
                tenantId={session.user.tenantId}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-gray-400">
              <div className="rounded-full bg-gray-100 p-5">
                <MessageSquare className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}
