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
  Plus,
  X,
} from "lucide-react";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApi } from "@/hooks/use-api";
import { useToast } from "@/components/ui/toast";
import { FilterSelect } from "@/components/ui/filter-select";
import { api } from "@/lib/api";

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

interface SimpleClient {
  id: string;
  name: string;
  status: string;
}

export default function BillingPage() {
  const t = useT();
  const { locale } = useLocale();
  const { toastSuccess, toastError } = useToast();
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [saving, setSaving] = useState(false);

  // Payment form state
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("paid");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  const METHODS = [
    { value: "cash", label: t.billing.cash },
    { value: "bank_transfer", label: t.billing.bankTransfer },
    { value: "card", label: t.billing.card },
    { value: "venmo", label: t.billing.venmo },
    { value: "zelle", label: t.billing.zelle },
    { value: "other", label: t.billing.other },
  ];

  const url = filter ? `/api/payments?status=${filter}` : "/api/payments";
  const { data, loading, refresh } = useApi<{ payments: PaymentWithClient[]; summary: Summary }>(url);

  useEffect(() => {
    api.get<SimpleClient[]>("/api/clients").then(setClients).catch(() => {});
  }, []);

  function resetForm() {
    setSelectedClientId("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setMethod("");
    setStatus("paid");
    setPeriod("");
    setDescription("");
    setNotes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await api.post(`/api/clients/${selectedClientId}/payments`, {
        amount,
        date,
        dueDate: dueDate || null,
        method: method || null,
        status,
        period: period || null,
        description: description || null,
        notes: notes || null,
      });
      toastSuccess(t.billing.paymentRecorded);
      setShowForm(false);
      resetForm();
      refresh();
    } catch {
      toastError(t.billing.failedToSave);
    } finally {
      setSaving(false);
    }
  }
  const payments = data?.payments || [];
  const summary = data?.summary || { totalCollected: 0, totalPending: 0, totalOverdue: 0, totalPayments: 0 };

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
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.billing.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.billing.subtitle}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary text-sm"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t.billing.recordPayment}
          </button>
        )}
      </div>

      {/* Record Payment Form */}
      {showForm && (
        <div className="card mb-6 border-2 border-brand-200">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{t.billing.recordPayment}</h4>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.billing.client} *
              </label>
              <FilterSelect
                value={selectedClientId}
                onChange={setSelectedClientId}
                placeholder={t.billing.selectClient}
                options={clients.filter((c) => c.status === "active").map((c) => ({ value: c.id, label: c.name }))}
                className="mt-1"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.amount} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.billing.amountPlaceholder}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.common.status}
                </label>
                <FilterSelect
                  value={status}
                  onChange={setStatus}
                  placeholder={t.common.status}
                  options={[
                    { value: "paid", label: t.billing.paid },
                    { value: "pending", label: t.billing.pending },
                    { value: "overdue", label: t.billing.overdue },
                    { value: "cancelled", label: t.billing.cancelled },
                  ]}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.paymentDate}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.dueDate}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.method}
                </label>
                <FilterSelect
                  value={method}
                  onChange={setMethod}
                  placeholder={t.billing.selectMethod}
                  options={METHODS}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.period}
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder={t.billing.periodPlaceholder}
                  className="input mt-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.common.description}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.billing.descriptionPlaceholder}
                className="input mt-1"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.common.notes}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t.billing.notesPlaceholder}
                className="input mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !selectedClientId}
              className="btn-primary mt-4 w-full"
            >
              {saving ? t.common.saving : t.billing.recordPayment}
            </button>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t.billing.totalCollected}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalCollected)}
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
              <p className="text-sm text-gray-500">{t.billing.pending}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalPending)}
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
              <p className="text-sm text-gray-500">{t.billing.overdue}</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalOverdue)}
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
              <p className="text-sm text-gray-500">{t.billing.totalTransactions}</p>
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
              {overduePayments.length} {t.billing.overduePayments}
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
                  {formatCurrency(p.amount, p.currency || "BAM")}
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
              {pendingPayments.length} {t.billing.pendingPayments}
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
                  {formatCurrency(p.amount, p.currency || "BAM")}
                  {p.dueDate && (
                    <span className="ml-1 text-xs text-yellow-600">
                      {t.billing.due} {new Date(p.dueDate).toLocaleDateString(getDateLocale(locale), { month: "short", day: "numeric" })}
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
            { value: "", label: t.billing.all },
            { value: "paid", label: t.billing.paid },
            { value: "pending", label: t.billing.pending },
            { value: "overdue", label: t.billing.overdue },
            { value: "cancelled", label: t.billing.cancelled },
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
            placeholder={t.billing.searchPayments}
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
              ? `${t.billing.noPayments} ${t.billing.noPaymentsFromClients}`
              : t.billing.noMatch}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">{t.billing.client}</th>
                <th className="px-4 py-3">{t.billing.amount}</th>
                <th className="px-4 py-3">{t.common.date}</th>
                <th className="px-4 py-3">{t.common.status}</th>
                <th className="px-4 py-3">{t.billing.method}</th>
                <th className="px-4 py-3">{t.billing.period}</th>
                <th className="px-4 py-3">{t.common.description}</th>
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
                    {formatCurrency(p.amount, p.currency || "BAM")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.date).toLocaleDateString(getDateLocale(locale), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {p.method ? (t.billing[p.method as keyof typeof t.billing] || p.method.replace("_", " ")) : "—"}
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
