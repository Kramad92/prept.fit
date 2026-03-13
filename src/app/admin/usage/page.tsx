"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, HardDrive, Zap, TrendingUp, ArrowUpRight } from "lucide-react";

interface UsageData {
  period: { days: number; since: string };
  totals: {
    aiCalls: number;
    tokensIn: number;
    tokensOut: number;
  };
  perTenant: {
    tenantId: string;
    name: string;
    slug: string;
    ai: { calls: number; tokensIn: number; tokensOut: number };
    storage: { files: number; bytes: number };
  }[];
  byEndpoint: {
    endpoint: string;
    calls: number;
    tokensIn: number;
    tokensOut: number;
  }[];
  byProvider: {
    provider: string;
    calls: number;
    tokensIn: number;
    tokensOut: number;
  }[];
  timeline: {
    date: string;
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

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "All time", value: 3650 },
];

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/usage?days=${period}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load usage data.</p>;

  const totalTokens = data.totals.tokensIn + data.totals.tokensOut;
  const totalStorageBytes = data.perTenant.reduce((s, t) => s + t.storage.bytes, 0);
  const totalStorageFiles = data.perTenant.reduce((s, t) => s + t.storage.files, 0);

  // Simple bar chart using divs
  const maxCalls = Math.max(...data.timeline.map((d) => d.calls), 1);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage</h1>
          <p className="mt-1 text-sm text-gray-500">AI and storage usage across the platform</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                period === opt.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600"><Cpu className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">AI Calls</p>
              <p className="text-2xl font-bold text-gray-900">{data.totals.aiCalls.toLocaleString()}</p>
              <p className="text-xs text-gray-400">{period >= 3650 ? "all time" : `last ${period} days`}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600"><Zap className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">Tokens Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatTokens(totalTokens)}</p>
              <p className="text-xs text-gray-400">{formatTokens(data.totals.tokensIn)} in / {formatTokens(data.totals.tokensOut)} out</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600"><HardDrive className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatBytes(totalStorageBytes)}</p>
              <p className="text-xs text-gray-400">{totalStorageFiles} files</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-sm text-gray-500">Active Coaches</p>
              <p className="text-2xl font-bold text-gray-900">{data.perTenant.filter((t) => t.ai.calls > 0).length}</p>
              <p className="text-xs text-gray-400">with AI usage in period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline chart */}
      {data.timeline.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Daily AI Calls</h2>
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
              {data.timeline.map((d) => {
                const height = Math.max(2, (d.calls / maxCalls) * 100);
                return (
                  <div key={d.date} className="group relative flex-1">
                    <div
                      className="w-full rounded-t bg-indigo-400 transition group-hover:bg-indigo-600"
                      style={{ height: `${height}%` }}
                    />
                    <div className="pointer-events-none absolute -top-10 left-1/2 z-10 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow group-hover:block">
                      {d.calls} calls
                      {d.tokensIn + d.tokensOut > 0 && ` / ${formatTokens(d.tokensIn + d.tokensOut)} tokens`}
                      <br />
                      {new Date(d.date).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-gray-400">
              <span>{data.timeline.length > 0 ? new Date(data.timeline[0].date).toLocaleDateString() : ""}</span>
              <span>{data.timeline.length > 0 ? new Date(data.timeline[data.timeline.length - 1].date).toLocaleDateString() : ""}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* By Endpoint */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">By Endpoint</h2>
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
                {data.byEndpoint.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No AI usage yet</td></tr>
                ) : (
                  data.byEndpoint
                    .sort((a, b) => b.calls - a.calls)
                    .map((e) => (
                      <tr key={e.endpoint} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatEndpoint(e.endpoint)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">{e.calls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensIn)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(e.tokensOut)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* By Provider */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">By Provider</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Provider</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Calls</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens In</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.byProvider.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No AI usage yet</td></tr>
                ) : (
                  data.byProvider
                    .sort((a, b) => b.calls - a.calls)
                    .map((p) => (
                      <tr key={p.provider} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 capitalize">{p.provider}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-700">{p.calls.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(p.tokensIn)}</td>
                        <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(p.tokensOut)}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Per-Coach Usage */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Usage by Coach</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Coach</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">AI Calls</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens In</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Tokens Out</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Storage</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Files</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.perTenant.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">No usage data yet</td></tr>
              ) : (
                data.perTenant.map((t) => (
                  <tr key={t.tenantId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/coaches/${t.tenantId}`} className="text-sm font-medium text-gray-900 hover:text-indigo-600">
                        {t.name}
                      </Link>
                      <p className="text-xs text-gray-400">/{t.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums font-medium text-gray-900">{t.ai.calls.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(t.ai.tokensIn)}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatTokens(t.ai.tokensOut)}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{formatBytes(t.storage.bytes)}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-500">{t.storage.files}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/coaches/${t.tenantId}`} className="flex items-center justify-end gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                        View <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
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
