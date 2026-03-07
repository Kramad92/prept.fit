"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      gender: formData.get("gender") as string,
      goals: formData.get("goals") as string,
      notes: formData.get("notes") as string,
      allergies: formData.get("allergies") as string,
      dietaryPrefs: formData.get("dietaryPrefs") as string,
      injuries: formData.get("injuries") as string,
      fitnessLevel: formData.get("fitnessLevel") as string,
      activityLevel: formData.get("activityLevel") as string,
    };

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const client = await res.json();
        router.push(`/dashboard/clients/${client.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.clients.backToClients}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t.clients.addClient}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-lg space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.clientName} *
          </label>
          <input
            type="text"
            name="name"
            required
            className="input mt-1"
            placeholder={t.clients.clientName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.email}
          </label>
          <input
            type="email"
            name="email"
            className="input mt-1"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.phone}
          </label>
          <input
            type="tel"
            name="phone"
            className="input mt-1"
            placeholder="+1 (555) 000-0000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.gender}
          </label>
          <select name="gender" className="input mt-1">
            <option value="">{t.photos.selectCategory}</option>
            <option value="male">{t.clients.male}</option>
            <option value="female">{t.clients.female}</option>
            <option value="other">{t.clients.other}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.goals}
          </label>
          <textarea
            name="goals"
            rows={3}
            className="input mt-1"
            placeholder={t.clients.goalsPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.clients.fitnessLevel}
            </label>
            <select name="fitnessLevel" className="input mt-1">
              <option value="">{t.clients.selectLevel}</option>
              <option value="beginner">{t.clients.beginner}</option>
              <option value="intermediate">{t.clients.intermediate}</option>
              <option value="advanced">{t.clients.advanced}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.clients.activityLevel}
            </label>
            <select name="activityLevel" className="input mt-1">
              <option value="">{t.clients.selectLevel}</option>
              <option value="sedentary">{t.clients.sedentary}</option>
              <option value="light">{t.clients.lightActivity}</option>
              <option value="moderate">{t.clients.moderateActivity}</option>
              <option value="active">{t.clients.activeLevel}</option>
              <option value="very_active">{t.clients.veryActive}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.allergies}
          </label>
          <input
            type="text"
            name="allergies"
            className="input mt-1"
            placeholder={t.clients.allergiesPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.dietaryPrefs}
          </label>
          <input
            type="text"
            name="dietaryPrefs"
            className="input mt-1"
            placeholder={t.clients.dietaryPrefsPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.clients.injuries}
          </label>
          <input
            type="text"
            name="injuries"
            className="input mt-1"
            placeholder={t.clients.injuriesPlaceholder}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t.common.notes}
          </label>
          <textarea
            name="notes"
            rows={3}
            className="input mt-1"
            placeholder={t.clients.notesPlaceholder}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? t.common.saving : t.clients.addClient}
          </button>
          <Link href="/dashboard/clients" className="btn-secondary">
            {t.common.cancel}
          </Link>
        </div>
      </form>
    </div>
  );
}
