"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { useT } from "@/lib/i18n";

interface ClientData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  goals: string | null;
  notes: string | null;
  allergies: string | null;
  dietaryPrefs: string | null;
  injuries: string | null;
  fitnessLevel: string | null;
  activityLevel: string | null;
  status: string;
}

export default function EditClientPage() {
  const t = useT();
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [gender, setGender] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("");
  const [activityLevel, setActivityLevel] = useState("");

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then((data: ClientData) => {
        setClient(data);
        setGender(data.gender || "");
        setFitnessLevel(data.fitnessLevel || "");
        setActivityLevel(data.activityLevel || "");
      })
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
      gender: gender || null,
      goals: fd.get("goals") || null,
      notes: fd.get("notes") || null,
      allergies: fd.get("allergies") || null,
      dietaryPrefs: fd.get("dietaryPrefs") || null,
      injuries: fd.get("injuries") || null,
      fitnessLevel: fitnessLevel || null,
      activityLevel: activityLevel || null,
      status: client!.status,
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
          <Input
            type="text"
            name="name"
            required
            defaultValue={client.name}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.email}
            </label>
            <Input
              type="email"
              name="email"
              defaultValue={client.email || ""}
              className="mt-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.phone}
            </label>
            <Input
              type="tel"
              name="phone"
              defaultValue={client.phone || ""}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.gender}
          </label>
          <FilterSelect
            value={gender}
            onChange={setGender}
            placeholder={t.clients.other}
            className="mt-1"
            options={[
              { value: "male", label: t.clients.male },
              { value: "female", label: t.clients.female },
              { value: "other", label: t.clients.other },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.goals}
          </label>
          <Textarea
            name="goals"
            rows={2}
            defaultValue={client.goals || ""}
            className="mt-1"
            placeholder={t.clients.goalsPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.clients.fitnessLevel}
            </label>
            <FilterSelect
              value={fitnessLevel}
              onChange={setFitnessLevel}
              placeholder={t.clients.selectLevel}
              className="mt-1"
              options={[
                { value: "beginner", label: t.clients.beginner },
                { value: "intermediate", label: t.clients.intermediate },
                { value: "advanced", label: t.clients.advanced },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.clients.activityLevel}
            </label>
            <FilterSelect
              value={activityLevel}
              onChange={setActivityLevel}
              placeholder={t.clients.selectLevel}
              className="mt-1"
              options={[
                { value: "sedentary", label: t.clients.sedentary },
                { value: "light", label: t.clients.lightActivity },
                { value: "moderate", label: t.clients.moderateActivity },
                { value: "active", label: t.clients.activeLevel },
                { value: "very_active", label: t.clients.veryActive },
              ]}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.allergies}
          </label>
          <Input
            type="text"
            name="allergies"
            defaultValue={client.allergies || ""}
            className="mt-1"
            placeholder={t.clients.allergiesPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.dietaryPrefs}
          </label>
          <Input
            type="text"
            name="dietaryPrefs"
            defaultValue={client.dietaryPrefs || ""}
            className="mt-1"
            placeholder={t.clients.dietaryPrefsPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.injuries}
          </label>
          <Input
            type="text"
            name="injuries"
            defaultValue={client.injuries || ""}
            className="mt-1"
            placeholder={t.clients.injuriesPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.notes}
          </label>
          <Textarea
            name="notes"
            rows={3}
            defaultValue={client.notes || ""}
            className="mt-1"
            placeholder={t.clients.notesPlaceholder}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1"
          >
            {saving ? t.common.saving : t.clients.saveChanges}
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/clients/${params.id}`}>
              {t.common.cancel}
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
