"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Dumbbell, UtensilsCrossed, Cpu, HardDrive, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  planTier: string;
  brandColor: string;
  createdAt: string;
  _count: {
    clients: number;
    users: number;
    workouts: number;
    mealPlans: number;
    aiUsageLogs: number;
    storageUsageLogs: number;
  };
  clients: {
    id: string;
    name: string;
    email: string | null;
    status: string;
    createdAt: string;
  }[];
  users: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
}

interface UsageData {
  period: { days: number };
  ai: {
    logs: {
      id: string;
      endpoint: string;
      tokensIn: number;
      tokensOut: number;
      provider: string;
      createdAt: string;
    }[];
    totalCalls: number;
    tokensIn: number;
    tokensOut: number;
    byEndpoint: {
      endpoint: string;
      calls: number;
      tokensIn: number;
      tokensOut: number;
    }[];
  };
  storage: {
    totalBytes: number;
    totalFiles: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatEndpoint(ep: string): string {
  return ep.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CoachDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [planTier, setPlanTier] = useState("");

  const id = params.id as string;

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/tenants/${id}`).then((r) => r.json()),
      fetch(`/api/admin/tenants/${id}/usage?days=30`).then((r) => r.json()),
    ])
      .then(([tenantData, usageData]) => {
        setTenant(tenantData);
        setPlanTier(tenantData.planTier);
        setUsage(usageData);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleActive() {
    if (!tenant) return;
    setToggling(true);
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !tenant.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTenant({ ...tenant, isActive: updated.isActive });
    }
    setToggling(false);
  }

  async function updatePlanTier() {
    if (!tenant || planTier === tenant.planTier) return;
    const res = await fetch(`/api/admin/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTier }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTenant({ ...tenant, planTier: updated.planTier });
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="text-gray-500">Coach not found.</p>;
  }

  const stats = [
    { label: "Clients", value: tenant._count.clients, icon: Users },
    { label: "Workouts", value: tenant._count.workouts, icon: Dumbbell },
    { label: "Meal Plans", value: tenant._count.mealPlans, icon: UtensilsCrossed },
    { label: "AI Calls", value: tenant._count.aiUsageLogs, icon: Cpu },
    { label: "Files", value: tenant._count.storageUsageLogs, icon: HardDrive },
  ];

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Coach profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="mt-1 text-sm text-gray-500">/{tenant.slug}</p>
            {tenant.email && <p className="text-sm text-gray-500">{tenant.email}</p>}
            {tenant.phone && <p className="text-sm text-gray-500">{tenant.phone}</p>}
            {tenant.bio && <p className="mt-2 text-sm text-gray-600">{tenant.bio}</p>}
            <p className="mt-2 text-xs text-gray-400">
              Joined {new Date(tenant.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`inline-flex self-start rounded-full px-3 py-1 text-sm font-medium ${tenant.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {tenant.isActive ? "Active" : "Inactive"}
            </span>
            <Button
              onClick={toggleActive}
              disabled={toggling}
              variant={tenant.isActive ? "destructive" : "default"}
              className={!tenant.isActive ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              {toggling ? "..." : tenant.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Plan Tier</label>
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value)}
          >
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          {planTier !== tenant.planTier && (
            <Button onClick={updatePlanTier} className="bg-indigo-600 hover:bg-indigo-700">
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <s.icon className="mx-auto h-5 w-5 text-gray-400" />
            <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Usage section */}
      {usage && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Usage (Last 30 Days)</h2>

          {/* Token summary */}
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-500">AI Calls</span>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{usage.ai.totalCalls}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-500">Tokens Used</span>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatTokens(usage.ai.tokensIn + usage.ai.tokensOut)}</p>
              <p className="text-xs text-gray-400">{formatTokens(usage.ai.tokensIn)} in / {formatTokens(usage.ai.tokensOut)} out</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-sky-500" />
                <span className="text-sm text-gray-500">Storage</span>
              </div>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatBytes(usage.storage.totalBytes)}</p>
              <p className="text-xs text-gray-400">{usage.storage.totalFiles} files</p>
            </div>
          </div>

          {/* Usage by endpoint */}
          {usage.ai.byEndpoint.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Endpoint</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Calls</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens In</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usage.ai.byEndpoint
                    .sort((a, b) => b.calls - a.calls)
                    .map((e) => (
                      <tr key={e.endpoint} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatEndpoint(e.endpoint)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">{e.calls}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensIn)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensOut)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent AI logs */}
          {usage.ai.logs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700">Recent Activity</h3>
              <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Endpoint</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Provider</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Tokens</th>
                      <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usage.ai.logs.slice(0, 15).map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{formatEndpoint(log.endpoint)}</td>
                        <td className="px-4 py-2">
                          <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{log.provider}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-sm tabular-nums text-gray-500">
                          {log.tokensIn + log.tokensOut > 0 ? (
                            <span>{formatTokens(log.tokensIn)} / {formatTokens(log.tokensOut)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-400">{timeAgo(log.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coach users */}
      {tenant.users.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Coach Users</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenant.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clients */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Clients ({tenant.clients.length})</h2>
        {tenant.clients.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">No clients yet</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenant.clients.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.email || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
