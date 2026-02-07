"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Search,
} from "lucide-react";

interface PaymentWithClient {
  id: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  method: string | null;
  status: string;
  period: string | null;
  description: string | null;
  notes: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
  };
}

interface Summary {
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  totalPayments: number;
}

export default function BillingPage() {
  const [payments, setPayments] = useState<PaymentWithClient[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalCollected: 0,
    totalPending: 0,
    totalOverdue: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    fetch(`/api/payments?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.payments);
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  const filtered = search
    ? payments.filter(
        (p) =>
          p.client.name.toLowerCase().includes(search.toLowerCase()) ||
          p.description?.toLowerCase().includes(search.toLowerCase()) ||
          p.period?.toLowerCase().includes(search.toLowerCase())
      )
    : payments;

  const overduePayments = payments.filter((p) => p.status === "overdue");
  const pendingPayments = payments.filter((p) => p.status === "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track client payments, outstanding balances, and payment history.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary.totalCollected.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                ${summary.totalPending.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">
                ${summary.totalOverdue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
              <TrendingUp className="h-6 w-6 text-brand-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalPayments}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Alert */}
      {overduePayments.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-800">
              {overduePayments.length} Overdue Payment{overduePayments.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {overduePayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/dashboard/clients/${p.client.id}`}
                  className="font-medium text-red-700 hover:underline"
                >
                  {p.client.name}
                </Link>
                <span className="font-semibold text-red-700">
                  ${p.amount.toFixed(2)}
                  {p.period && ` · ${p.period}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Alert */}
      {pendingPayments.length > 0 && (
        <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              {pendingPayments.length} Pending Payment{pendingPayments.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {pendingPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/dashboard/clients/${p.client.id}`}
                  className="font-medium text-yellow-700 hover:underline"
                >
                  {p.client.name}
                </Link>
                <span className="font-semibold text-yellow-700">
                  ${p.amount.toFixed(2)}
                  {p.dueDate && (
                    <span className="ml-1 text-xs text-yellow-600">
                      due {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {[
            { value: "", label: "All" },
            { value: "paid", label: "Paid" },
            { value: "pending", label: "Pending" },
            { value: "overdue", label: "Overdue" },
            { value: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Payment Table */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {payments.length === 0
              ? "No payments recorded yet. Record payments from individual client pages."
              : "No payments match your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clients/${p.client.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                    >
                      {p.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    ${p.amount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : p.status === "overdue"
                            ? "bg-red-100 text-red-700"
                            : p.status === "cancelled"
                              ? "bg-gray-100 text-gray-500"
                              : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.method ? p.method.replace("_", " ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.period || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.description || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
