"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  X,
  Trash2,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { Payment } from "@/types";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

interface ClientPaymentsTabProps {
  clientId: string;
}

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const { toastSuccess, toastError } = useToast();
  const t = useT();

  const METHODS = [
    { value: "cash", label: t.billing.cash },
    { value: "bank_transfer", label: t.billing.bankTransfer },
    { value: "card", label: t.billing.card },
    { value: "venmo", label: t.billing.venmo },
    { value: "zelle", label: t.billing.zelle },
    { value: "other", label: t.billing.other },
  ];
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("paid");
  const [period, setPeriod] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  function loadPayments() {
    api.get<Payment[]>(`/api/clients/${clientId}/payments`)
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch(() => {
        toastError(t.billing.failedToLoad);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPayments();
  }, [clientId]);

  function resetForm() {
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setDueDate("");
    setMethod("");
    setStatus("paid");
    setPeriod("");
    setDescription("");
    setNotes("");
    setEditingId(null);
  }

  function startEdit(p: Payment) {
    setEditingId(p.id);
    setAmount(p.amount.toString());
    setDate(p.date.split("T")[0]);
    setDueDate(p.dueDate ? p.dueDate.split("T")[0] : "");
    setMethod(p.method || "");
    setStatus(p.status);
    setPeriod(p.period || "");
    setDescription(p.description || "");
    setNotes(p.notes || "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      amount,
      date,
      dueDate: dueDate || null,
      method: method || null,
      status,
      period: period || null,
      description: description || null,
      notes: notes || null,
    };

    try {
      if (editingId) {
        await api.put(`/api/clients/${clientId}/payments/${editingId}`, payload);
      } else {
        await api.post(`/api/clients/${clientId}/payments`, payload);
      }
      toastSuccess(editingId ? t.billing.paymentUpdated : t.billing.paymentRecorded);
      setShowForm(false);
      resetForm();
      loadPayments();
    } catch {
      toastError(t.billing.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/payments/${paymentId}`);
      toastSuccess(t.billing.paymentDeleted);
      loadPayments();
    } catch {
      toastError(t.billing.failedToDelete);
    }
  }

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalOverdue = payments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t.billing.collected}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t.billing.pending}</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t.billing.overdue}</p>
            <p className="text-lg font-bold text-red-600">
              {formatCurrency(totalOverdue)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.billing.paymentHistory} ({payments.length})
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary text-sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          {t.billing.recordPayment}
        </button>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="card mb-4 border-2 border-brand-200">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                {editingId ? t.billing.editPayment : t.billing.recordPayment}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="rounded p-1 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
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
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input mt-1"
                >
                  <option value="paid">{t.billing.paid}</option>
                  <option value="pending">{t.billing.pending}</option>
                  <option value="overdue">{t.billing.overdue}</option>
                  <option value="cancelled">{t.billing.cancelled}</option>
                </select>
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
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">{t.billing.selectMethod}</option>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
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
              disabled={saving}
              className="btn-primary mt-4 w-full"
            >
              {saving
                ? t.common.saving
                : editingId
                  ? t.billing.updatePayment
                  : t.billing.recordPayment}
            </button>
          </form>
        </div>
      )}

      {/* Payment List */}
      {payments.length === 0 ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <DollarSign className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.billing.noPayments}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    p.status === "paid"
                      ? "bg-green-50"
                      : p.status === "overdue"
                        ? "bg-red-50"
                        : p.status === "cancelled"
                          ? "bg-gray-50"
                          : "bg-yellow-50"
                  }`}
                >
                  <DollarSign
                    className={`h-5 w-5 ${
                      p.status === "paid"
                        ? "text-green-600"
                        : p.status === "overdue"
                          ? "text-red-600"
                          : p.status === "cancelled"
                            ? "text-gray-400"
                            : "text-yellow-600"
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(p.amount, p.currency || "BAM")}
                    </p>
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
                      {t.statuses[p.status as keyof typeof t.statuses] || p.status}
                    </span>
                    {p.method && (
                      <span className="text-xs text-gray-400">
                        {t.common.via} {METHODS.find(m => m.value === p.method)?.label || p.method.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>
                      {new Date(p.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {p.period && <span>· {p.period}</span>}
                    {p.description && <span>· {p.description}</span>}
                  </div>
                  {p.notes && (
                    <p className="mt-1 text-xs italic text-gray-400">
                      {p.notes}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(p)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
