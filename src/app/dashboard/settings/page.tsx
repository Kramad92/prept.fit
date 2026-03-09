"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, Palette, Clock, ChevronRight, Globe, Mail } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useT, useLocale, type Locale } from "@/lib/i18n";

interface Settings {
  name: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  timezone: string | null;
  locale: string | null;
  units: string | null;
  currency: string | null;
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toastSuccess, toastError } = useToast();
  const t = useT();
  const { setLocale } = useLocale();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => toastError(t.settings.failedToLoad))
      .finally(() => setLoading(false));
  }, [toastError]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      bio: formData.get("bio"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      website: formData.get("website"),
      timezone: formData.get("timezone"),
      locale: formData.get("locale"),
      units: formData.get("units"),
      currency: formData.get("currency"),
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toastSuccess(t.settings.settingsSaved);
      } else {
        toastError(t.settings.failedToSave);
      }
    } catch {
      toastError(t.settings.failedToSave);
    } finally {
      setSaving(false);
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
      <h1 className="text-2xl font-bold text-gray-900">{t.settings.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.settings.subtitle}
      </p>

      {/* Quick Links */}
      <div className="mt-6 max-w-lg space-y-3">
        <Link
          href="/dashboard/settings/availability"
          className="card flex items-center justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t.settings.availability}</p>
              <p className="text-sm text-gray-500">
                {t.settings.availabilityDesc}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          href="/dashboard/settings/landing-page"
          className="card flex items-center justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
              <Globe className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t.settings.landingPage}</p>
              <p className="text-sm text-gray-500">
                {t.settings.landingPageDesc}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          href="/dashboard/settings/inquiries"
          className="card flex items-center justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t.landingPage.inquiries}</p>
              <p className="text-sm text-gray-500">
                {t.landingPage.inquiriesDesc}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-6">
        {/* Branding */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Palette className="h-4 w-4" />
            {t.settings.branding}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.businessName}
            </label>
            <input
              type="text"
              name="name"
              defaultValue={settings?.name || ""}
              className="input mt-1"
              placeholder={t.settings.businessNamePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.bio}
            </label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={settings?.bio || ""}
              className="input mt-1"
              placeholder={t.settings.bioPlaceholder}
            />
          </div>

        </div>

        {/* Contact */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {t.settings.contactInfo}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.email}
            </label>
            <input
              type="email"
              name="email"
              defaultValue={settings?.email || ""}
              className="input mt-1"
              placeholder="vas@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.phone}
            </label>
            <input
              type="tel"
              name="phone"
              defaultValue={settings?.phone || ""}
              className="input mt-1"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.website}
            </label>
            <input
              type="url"
              name="website"
              defaultValue={settings?.website || ""}
              className="input mt-1"
              placeholder="https://yoursite.com"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">{t.settings.preferences}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.timezone}
            </label>
            <select
              name="timezone"
              defaultValue={settings?.timezone || "Europe/Sarajevo"}
              className="input mt-1"
            >
              <option value="America/New_York">{t.settings.easternTime}</option>
              <option value="America/Chicago">{t.settings.centralTime}</option>
              <option value="America/Denver">{t.settings.mountainTime}</option>
              <option value="America/Los_Angeles">{t.settings.pacificTime}</option>
              <option value="Europe/London">{t.settings.london}</option>
              <option value="Europe/Paris">{t.settings.centralEuropean}</option>
              <option value="Europe/Sarajevo">{t.settings.sarajevo}</option>
              <option value="Australia/Sydney">{t.settings.sydney}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jezik / Language
            </label>
            <select
              name="locale"
              defaultValue={settings?.locale || "bs"}
              className="input mt-1"
              onChange={(e) => {
                const newLocale = e.target.value as Locale;
                setLocale(newLocale);
                fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ locale: newLocale }),
                });
              }}
            >
              <option value="bs">Bosanski</option>
              <option value="sr">Srpski</option>
              <option value="hr">Hrvatski</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.units}
            </label>
            <select
              name="units"
              defaultValue={settings?.units || "metric"}
              className="input mt-1"
            >
              <option value="metric">{t.settings.metric}</option>
              <option value="imperial">{t.settings.imperial}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.currency}
            </label>
            <select
              name="currency"
              defaultValue={settings?.currency || "BAM"}
              className="input mt-1"
            >
              <option value="BAM">BAM (KM)</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t.common.saving : t.settings.saveSettings}
          </button>
        </div>
      </form>
    </div>
  );
}
