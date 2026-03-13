"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, Cpu, HardDrive, Zap, ArrowUpRight } from "lucide-react";

interface DashboardData {
  stats: {
    tenants: number;
    clients: number;
    users: number;
    aiCalls: number;
    aiCallsLast30d: number;
    totalTokensIn: number;
    totalTokensOut: number;
    storageBytes: number;
  };
  recentTenants: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    planTier: string;
    createdAt: string;
    _count: { clients: number };
  }[];
  recentAiLogs: {
    id: string;
    endpoint: string;
    tokensIn: number;
    tokensOut: number;
    provider: string;
    createdAt: string;
    tenant: { name: string; slug: string };
  }[];
  aiByEndpoint: {
    endpoint: string;
    calls: number;
    tokensIn: number;
    tokensOut: number;
  }[];
  aiByProvider: {
    provider: string;
    calls: number;
    tokensIn: number;
    tokensOut: number;
  }[];
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

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load dashboard.</p>;

  const totalTokens = data.stats.totalTokensIn + data.stats.totalTokensOut;

  const statCards = [
    { label: "Coaches", value: data.stats.tenants, icon: Users, color: "bg-indigo-50 text-indigo-600", href: "/admin/coaches" },
    { label: "Clients", value: data.stats.clients, icon: UserCheck, color: "bg-emerald-50 text-emerald-600", href: "/admin/clients" },
    { label: "AI Calls", value: data.stats.aiCalls, sub: `${data.stats.aiCallsLast30d} last 30d`, icon: Cpu, color: "bg-amber-50 text-amber-600", href: "/admin/usage" },
    { label: "Tokens Used", value: formatTokens(totalTokens), sub: `${formatTokens(data.stats.totalTokensIn)} in / ${formatTokens(data.stats.totalTokensOut)} out`, icon: Zap, color: "bg-purple-50 text-purple-600", href: "/admin/usage" },
    { label: "Storage", value: formatBytes(data.stats.storageBytes), icon: HardDrive, color: "bg-sky-50 text-sky-600", href: "/admin/usage" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Platform overview and metrics</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className="group rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                {card.sub && <p className="text-xs text-gray-400">{card.sub}</p>}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* AI Usage by Endpoint */}
        {data.aiByEndpoint.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">AI Usage by Endpoint</h2>
              <Link href="/admin/usage" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                Details <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
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
                  {data.aiByEndpoint
                    .sort((a, b) => b.calls - a.calls)
                    .map((e) => (
                      <tr key={e.endpoint} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatEndpoint(e.endpoint)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">{e.calls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensIn)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensOut)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent AI Activity */}
        {data.recentAiLogs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent AI Activity</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens</th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.recentAiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-900">{formatEndpoint(log.endpoint)}</span>
                        <span className="ml-2 inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">{log.provider}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{log.tenant.name}</td>
                      <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">
                        {log.tokensIn + log.tokensOut > 0 ? formatTokens(log.tokensIn + log.tokensOut) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-400">{timeAgo(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Recent Signups */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Signups</h2>
          <Link href="/admin/coaches" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Clients</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentTenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <Link href={`/admin/coaches/${t.id}`} className="hover:text-indigo-600">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.slug}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t._count.clients}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {t.planTier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
