"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";
import { useApi } from "@/hooks/use-api";

interface Client {
  id: string;
  name: string;
  email: string | null;
  status: string;
  avatar?: string;
  goals: string | null;
}

export default function ClientsPage() {
  const t = useT();
  const [search, setSearch] = useState("");
  const { data: clients, loading } = useApi<Client[]>("/api/clients");

  const filtered = (clients || []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.clients.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.clients.manageRoster}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/clients/new">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t.clients.addClient}</span>
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={t.clients.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Client List */}
      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title={t.clients.noClients}
            description={t.clients.noClientsDesc}
            action={
              <Button asChild>
                <Link href="/dashboard/clients/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t.clients.addClient}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3 stagger-in">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="card flex items-center gap-4 transition-shadow hover:shadow-md"
            >
              <Avatar name={client.name} src={client.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {client.name}
                </p>
                {client.goals && (
                  <p className="text-sm text-gray-500 truncate">
                    {client.goals}
                  </p>
                )}
              </div>
              <StatusBadge status={client.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
