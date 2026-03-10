"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Trash2, Clock } from "lucide-react";
import { FilterSelect } from "@/components/ui/filter-select";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import type { Inquiry } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-600",
};

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toastSuccess, toastError } = useToast();
  const t = useT();

  useEffect(() => {
    fetch("/api/settings/inquiries")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInquiries(data);
      })
      .catch(() => toastError(t.errors.failedToLoad))
      .finally(() => setLoading(false));
  }, [toastError, t]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/settings/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInquiries(inquiries.map((inq) => (inq.id === id ? { ...inq, status } : inq)));
      }
    } catch {
      toastError(t.errors.failedToSave);
    }
  }

  async function deleteInquiry(id: string) {
    try {
      await fetch(`/api/settings/inquiries/${id}`, { method: "DELETE" });
      setInquiries(inquiries.filter((inq) => inq.id !== id));
      toastSuccess(t.common.delete);
    } catch {
      toastError(t.errors.failedToDelete);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t.availability.backToSettings}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{t.landingPage.inquiries}</h1>
      <p className="mt-1 text-sm text-gray-500">{t.landingPage.inquiriesDesc}</p>

      {inquiries.length === 0 ? (
        <div className="mt-10 text-center">
          <Mail className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">{t.landingPage.noInquiries}</h3>
          <p className="mt-1 text-sm text-gray-500">{t.landingPage.noInquiriesDesc}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {inquiries.map((inq) => (
            <div key={inq.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{inq.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[inq.status] || STATUS_COLORS.new
                      }`}
                    >
                      {inq.status === "new"
                        ? t.landingPage.statusNew
                        : inq.status === "contacted"
                        ? t.landingPage.statusContacted
                        : t.landingPage.statusArchived}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {inq.email}
                    {inq.phone && ` · ${inq.phone}`}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{inq.message}</p>
                  {inq.preferredSlot && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      Preferred: {inq.preferredSlot}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(inq.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <FilterSelect
                    value={inq.status}
                    onChange={(v) => updateStatus(inq.id, v)}
                    placeholder={t.common.status}
                    className="w-32"
                    options={[
                      { value: "new", label: t.landingPage.statusNew },
                      { value: "contacted", label: t.landingPage.statusContacted },
                      { value: "archived", label: t.landingPage.statusArchived },
                    ]}
                  />
                  <button
                    onClick={() => deleteInquiry(inq.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
