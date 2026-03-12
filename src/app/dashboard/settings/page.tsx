"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, Palette, Clock, ChevronRight, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FilterSelect } from "@/components/ui/filter-select";
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
  const [timezone, setTimezone] = useState("Europe/Sarajevo");
  const [localeVal, setLocaleVal] = useState("bs");
  const [units, setUnits] = useState("metric");
  const [currency, setCurrency] = useState("BAM");
  const t = useT();
  const { setLocale } = useLocale();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data.timezone) setTimezone(data.timezone);
        if (data.locale) setLocaleVal(data.locale);
        if (data.units) setUnits(data.units);
        if (data.currency) setCurrency(data.currency);
      })
      .catch(() => toast.error(t.settings.failedToLoad))
      .finally(() => setLoading(false));
  }, []);

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
      timezone,
      locale: localeVal,
      units,
      currency,
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(t.settings.settingsSaved);
      } else {
        toast.error(t.settings.failedToSave);
      }
    } catch {
      toast.error(t.settings.failedToSave);
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
            <Input
              type="text"
              name="name"
              defaultValue={settings?.name || ""}
              className="mt-1"
              placeholder={t.settings.businessNamePlaceholder}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.bio}
            </label>
            <Textarea
              name="bio"
              rows={3}
              defaultValue={settings?.bio || ""}
              className="mt-1"
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
            <Input
              type="email"
              name="email"
              defaultValue={settings?.email || ""}
              className="mt-1"
              placeholder="vas@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.common.phone}
            </label>
            <Input
              type="tel"
              name="phone"
              defaultValue={settings?.phone || ""}
              className="mt-1"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.website}
            </label>
            <Input
              type="url"
              name="website"
              defaultValue={settings?.website || ""}
              className="mt-1"
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
            <FilterSelect
              value={timezone}
              onChange={setTimezone}
              placeholder={t.settings.timezone}
              className="mt-1"
              options={[
                { value: "America/New_York", label: t.settings.easternTime },
                { value: "America/Chicago", label: t.settings.centralTime },
                { value: "America/Denver", label: t.settings.mountainTime },
                { value: "America/Los_Angeles", label: t.settings.pacificTime },
                { value: "Europe/London", label: t.settings.london },
                { value: "Europe/Paris", label: t.settings.centralEuropean },
                { value: "Europe/Sarajevo", label: t.settings.sarajevo },
                { value: "Australia/Sydney", label: t.settings.sydney },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jezik / Language
            </label>
            <FilterSelect
              value={localeVal}
              onChange={(v) => {
                setLocaleVal(v);
                const newLocale = v as Locale;
                setLocale(newLocale);
                fetch("/api/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ locale: newLocale }),
                });
              }}
              placeholder="Jezik / Language"
              className="mt-1"
              options={[
                { value: "bs", label: "Bosanski" },
                { value: "sr", label: "Srpski" },
                { value: "hr", label: "Hrvatski" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.units}
            </label>
            <FilterSelect
              value={units}
              onChange={setUnits}
              placeholder={t.settings.units}
              className="mt-1"
              options={[
                { value: "metric", label: t.settings.metric },
                { value: "imperial", label: t.settings.imperial },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t.settings.currency}
            </label>
            <FilterSelect
              value={currency}
              onChange={setCurrency}
              placeholder={t.settings.currency}
              className="mt-1"
              options={[
                { value: "BAM", label: "BAM (KM)" },
                { value: "EUR", label: "EUR" },
                { value: "USD", label: "USD" },
                { value: "GBP", label: "GBP" },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? t.common.saving : t.settings.saveSettings}
          </Button>
        </div>
      </form>
    </div>
  );
}
