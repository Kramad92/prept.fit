"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/skeleton";

interface Client {
  id: string;
  name: string;
  email: string | null;
  status: string;
  avatar?: string;
  goals: string | null;
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your client roster
          </p>
        </div>
        <Link href="/dashboard/clients/new" className="btn-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="relative mt-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Client List */}
      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add your first client to start managing their training."
            action={
              <Link href="/dashboard/clients/new" className="btn-primary">
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Link>
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
