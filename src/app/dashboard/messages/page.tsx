"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import Link from "next/link";

interface ClientWithUnread {
  id: string;
  name: string;
  avatar?: string;
  status: string;
  unreadCount: number;
}

export default function MessagesListPage() {
  const t = useT();
  const [clients, setClients] = useState<ClientWithUnread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/messages/unread").then((r) => r.json()),
    ])
      .then(([clientList, unread]) => {
        setClients(
          clientList.map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            unreadCount: unread[c.id] || 0,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t.messages.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.messages.subtitle}</p>

      {clients.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={MessageSquare}
            title={t.messages.noClients}
            description={t.messages.noClientsDesc}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {clients
            .sort((a, b) => b.unreadCount - a.unreadCount)
            .map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/messages/${client.id}`}
                className="card flex items-center gap-4 transition-shadow hover:shadow-md"
              >
                <Avatar name={client.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {client.name}
                  </p>
                </div>
                {client.unreadCount > 0 && (
                  <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white">
                    {client.unreadCount}
                  </span>
                )}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
