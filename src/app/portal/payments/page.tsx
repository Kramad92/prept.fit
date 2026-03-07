"use client";

import { useState } from "react";
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApi } from "@/hooks/use-api";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  date: string;
  dueDate: string | null;
  method: string | null;
  status: string;
  period: string | null;
  description: string | null;
}

interface Summary {
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

export default function PortalPaymentsPage() {
  const t = useT();
  const { locale } = useLocale();
  const [filter, setFilter] = useState<string>("");

  const { data, loading } = useApi<{ payments: Payment[]; summary: Summary }>(
    "/api/portal/payments"
  );
  const payments = data?.payments || [];
  const summary = data?.summary || { totalPaid: 0, totalPending: 0, totalOverdue: 0 };

  const filtered = filter ? payments.filter((p) => p.status === filter) : payments;
  const overduePayments = payments.filter((p) => p.status === "overdue");

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
        <h1 className="text-2xl font-bold text-gray-900">{t.portalPayments.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.portalPayments.subtitle}</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.billing.paid}</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(summary.totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-50">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.billing.pending}</p>
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(summary.totalPending)}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t.billing.overdue}</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(summary.totalOverdue)}
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
              {t.portalPayments.overdueAlert}
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {overduePayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-red-700">
                  {p.description || p.period || t.portalPayments.payment}
                </span>
                <span className="font-semibold text-red-700">
                  {formatCurrency(p.amount, p.currency || "BAM")}
                  {p.dueDate && (
                    <span className="ml-1 text-xs text-red-600">
                      {t.billing.due}{" "}
                      {new Date(p.dueDate).toLocaleDateString(getDateLocale(locale), {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-red-600">
            {t.portalPayments.contactCoach}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex gap-1">
        {[
          { value: "", label: t.billing.all },
          { value: "paid", label: t.billing.paid },
          { value: "pending", label: t.billing.pending },
          { value: "overdue", label: t.billing.overdue },
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

      {/* Payment List */}
      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            {payments.length === 0
              ? t.portalPayments.noPayments
              : t.portalPayments.noMatch}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="card flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {p.description || t.portalPayments.payment}
                  </p>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  {p.period && <span>{p.period}</span>}
                  <span>
                    {new Date(p.date).toLocaleDateString(getDateLocale(locale), {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  {p.method && (
                    <span>
                      {t.billing[p.method as keyof typeof t.billing] ||
                        p.method.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
              <p className="ml-4 shrink-0 text-sm font-bold text-gray-900">
                {formatCurrency(p.amount, p.currency || "BAM")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
