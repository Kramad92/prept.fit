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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FilterSelect } from "@/components/ui/filter-select";
import { useT } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";

interface ClientPaymentsTabProps {
  clientId: string;
}

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {

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
        toast.error(t.billing.failedToLoad);
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
      toast.success(editingId ? t.billing.paymentUpdated : t.billing.paymentRecorded);
      setShowForm(false);
      resetForm();
      loadPayments();
    } catch {
      toast.error(t.billing.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/payments/${paymentId}`);
      toast.success(t.billing.paymentDeleted);
      loadPayments();
    } catch {
      toast.error(t.billing.failedToDelete);
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
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="card flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
          <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-green-50 sm:flex">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <CheckCircle2 className="h-5 w-5 text-green-600 sm:hidden" />
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{t.billing.collected}</p>
            <p className="text-base font-bold text-gray-900 sm:text-lg">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>
        <div className="card flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
          <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-yellow-50 sm:flex">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <Clock className="h-5 w-5 text-yellow-600 sm:hidden" />
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{t.billing.pending}</p>
            <p className="text-base font-bold text-gray-900 sm:text-lg">
              {formatCurrency(totalPending)}
            </p>
          </div>
        </div>
        <div className="card flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-3 sm:text-left">
          <div className="hidden h-10 w-10 items-center justify-center rounded-lg bg-red-50 sm:flex">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <AlertTriangle className="h-5 w-5 text-red-600 sm:hidden" />
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{t.billing.overdue}</p>
            <p className="text-base font-bold text-red-600 sm:text-lg">
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
        <Button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="text-sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          {t.billing.recordPayment}
        </Button>
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

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.amount} *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.billing.amountPlaceholder}
                  className="mt-1"
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
                  className="mt-1"
                  options={[
                    { value: "paid", label: t.billing.paid },
                    { value: "pending", label: t.billing.pending },
                    { value: "overdue", label: t.billing.overdue },
                    { value: "cancelled", label: t.billing.cancelled },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.paymentDate}
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.dueDate}
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1"
                />
              </div> */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.method}
                </label>
                <FilterSelect
                  value={method}
                  onChange={setMethod}
                  placeholder={t.billing.selectMethod}
                  className="mt-1"
                  options={METHODS}
                />
              </div> */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.billing.period}
                </label>
                <Input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder={t.billing.periodPlaceholder}
                  className="mt-1"
                />
              </div> */}
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.common.description}
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.billing.descriptionPlaceholder}
                className="mt-1"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                {t.common.notes}
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={t.billing.notesPlaceholder}
                className="mt-1"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="mt-4 w-full"
            >
              {saving
                ? t.common.saving
                : editingId
                  ? t.billing.updatePayment
                  : t.billing.recordPayment}
            </Button>
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
