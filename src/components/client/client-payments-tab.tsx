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

interface ClientPaymentsTabProps {
  clientId: string;
}

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "other", label: "Other" },
];

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const { toastSuccess, toastError } = useToast();
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
    fetch(`/api/clients/${clientId}/payments`)
      .then((r) => r.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch(() => {
        toastError("Failed to load payments");
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
      const url = editingId
        ? `/api/clients/${clientId}/payments/${editingId}`
        : `/api/clients/${clientId}/payments`;
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toastSuccess(editingId ? "Payment updated" : "Payment recorded");
        setShowForm(false);
        resetForm();
        loadPayments();
      } else {
        const err = await res.json().catch(() => null);
        toastError(err?.error || "Failed to save payment");
      }
    } catch {
      toastError("Failed to save payment");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(paymentId: string) {
    try {
      await fetch(`/api/clients/${clientId}/payments/${paymentId}`, {
        method: "DELETE",
      });
      toastSuccess("Payment deleted");
      loadPayments();
    } catch {
      toastError("Failed to delete payment");
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
            <p className="text-xs text-gray-500">Collected</p>
            <p className="text-lg font-bold text-gray-900">
              ${totalPaid.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-lg font-bold text-gray-900">
              ${totalPending.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Overdue</p>
            <p className="text-lg font-bold text-red-600">
              ${totalOverdue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Payment History ({payments.length})
        </h3>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="btn-primary text-sm"
        >
          <Plus className="mr-1 h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* Payment Form */}
      {showForm && (
        <div className="card mb-4 border-2 border-brand-200">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                {editingId ? "Edit Payment" : "Record Payment"}
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
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="150.00"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="input mt-1"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Date
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
                  Due Date
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
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="input mt-1"
                >
                  <option value="">Select method...</option>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Period
                </label>
                <input
                  type="text"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  placeholder="March 2026"
                  className="input mt-1"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Monthly coaching fee"
                className="input mt-1"
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any additional notes..."
                className="input mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary mt-4 w-full"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Payment"
                  : "Record Payment"}
            </button>
          </form>
        </div>
      )}

      {/* Payment List */}
      {payments.length === 0 ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <DollarSign className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">No payments recorded yet.</p>
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
                      ${p.amount.toFixed(2)}
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
                      {p.status}
                    </span>
                    {p.method && (
                      <span className="text-xs text-gray-400">
                        via {p.method.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs text-gray-500">
                    <span>
                      {new Date(p.date).toLocaleDateString("en-US", {
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
