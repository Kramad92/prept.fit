"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  goals: string | null;
  notes: string | null;
  status: string;
}

export default function EditClientPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then(setClient)
      .catch(() => router.push("/dashboard/clients"));
  }, [params.id, router]);

  if (!client) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      email: fd.get("email") || null,
      phone: fd.get("phone") || null,
      gender: fd.get("gender") || null,
      goals: fd.get("goals") || null,
      notes: fd.get("notes") || null,
      status: fd.get("status"),
    };

    const res = await fetch(`/api/clients/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push(`/dashboard/clients/${params.id}`);
    } else {
      setError(t.errors.failedToSave);
    }
    setSaving(false);
  }

  return (
    <div>
      <Link
        href={`/dashboard/clients/${params.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.clients.backToClients}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">{t.clients.editClient}</h1>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.name} *
          </label>
          <input
            type="text"
            name="name"
            required
            defaultValue={client.name}
            className="input mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.email}
            </label>
            <input
              type="email"
              name="email"
              defaultValue={client.email || ""}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.phone}
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={client.phone || ""}
              className="input mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.clients.gender}
            </label>
            <select
              name="gender"
              defaultValue={client.gender || ""}
              className="input mt-1"
            >
              <option value="">{t.clients.other}</option>
              <option value="male">{t.clients.male}</option>
              <option value="female">{t.clients.female}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.status}
            </label>
            <select
              name="status"
              defaultValue={client.status}
              className="input mt-1"
            >
              <option value="active">{t.clients.active}</option>
              <option value="paused">{t.clients.paused}</option>
              <option value="inactive">{t.clients.inactive}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.goals}
          </label>
          <textarea
            name="goals"
            rows={2}
            defaultValue={client.goals || ""}
            className="input mt-1"
            placeholder={t.clients.goalsPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.notes}
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes || ""}
            className="input mt-1"
            placeholder={t.clients.notesPlaceholder}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? t.common.saving : t.clients.saveChanges}
          </button>
          <Link
            href={`/dashboard/clients/${params.id}`}
            className="btn-secondary"
          >
            {t.common.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
