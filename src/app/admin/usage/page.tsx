"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive } from "lucide-react";

interface UsageData {
  tenants: {
    id: string;
    name: string;
    slug: string;
    _count: { aiUsageLogs: number; storageUsageLogs: number };
    _storageBytes: number;
  }[];
  totals: {
    aiCalls: number;
    storageBytes: number;
    storageFiles: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all tenants with usage counts
    Promise.all([
      fetch("/api/admin/tenants").then((r) => r.json()),
      fetch("/api/admin/dashboard").then((r) => r.json()),
    ])
      .then(([tenants, dashboard]) => {
        // Tenants already have _count but we need to enhance with storage bytes
        // For now, show count-based data
        setData({
          tenants: tenants.map((t: any) => ({
            id: t.id,
            name: t.name,
            slug: t.slug,
            _count: { aiUsageLogs: 0, storageUsageLogs: 0 },
            _storageBytes: 0,
          })),
          totals: {
            aiCalls: dashboard.stats.aiCalls,
            storageBytes: dashboard.stats.storageBytes,
            storageFiles: 0,
          },
        });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load usage data.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
      <p className="mt-1 text-sm text-gray-500">AI and storage usage across the platform</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total AI Calls</p>
              <p className="text-2xl font-bold text-gray-900">{data.totals.aiCalls}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(data.totals.storageBytes)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Usage by Coach</h2>
        <p className="mt-1 text-sm text-gray-400">
          Per-tenant usage details are available on each coach&apos;s detail page.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Slug</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.tenants.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-sm text-gray-400">
                    No usage data yet
                  </td>
                </tr>
              ) : (
                data.tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{t.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={`/admin/coaches/${t.id}`} className="text-sm text-indigo-600 hover:text-indigo-700">
                        View
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
