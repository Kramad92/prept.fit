"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, Cpu, HardDrive } from "lucide-react";

interface DashboardData {
  stats: {
    tenants: number;
    clients: number;
    users: number;
    aiCalls: number;
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
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
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

  const statCards = [
    { label: "Coaches", value: data.stats.tenants, icon: Users, color: "bg-indigo-50 text-indigo-600" },
    { label: "Clients", value: data.stats.clients, icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "AI Calls", value: data.stats.aiCalls, icon: Cpu, color: "bg-amber-50 text-amber-600" },
    { label: "Storage", value: formatBytes(data.stats.storageBytes), icon: HardDrive, color: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500">Platform overview and metrics</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

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
