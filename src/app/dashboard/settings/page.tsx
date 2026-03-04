"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Save, Palette, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface Settings {
  name: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  brandColor: string | null;
  timezone: string | null;
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const { toastSuccess, toastError } = useToast();

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => toastError("Failed to load settings"))
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
      brandColor: formData.get("brandColor"),
      timezone: formData.get("timezone"),
    };

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toastSuccess("Settings saved!");
      } else {
        toastError("Failed to save settings");
      }
    } catch {
      toastError("Failed to save settings");
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
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      <p className="mt-1 text-sm text-gray-500">
        Customize your TrainerHub profile
      </p>

      {/* Quick Links */}
      <div className="mt-6 max-w-lg">
        <Link
          href="/dashboard/settings/availability"
          className="card flex items-center justify-between transition-shadow hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Availability</p>
              <p className="text-sm text-gray-500">
                Set your bookable hours for clients
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
            Branding
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              type="text"
              name="name"
              defaultValue={settings?.name || ""}
              className="input mt-1"
              placeholder="Your Fitness Business"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={settings?.bio || ""}
              className="input mt-1"
              placeholder="Tell clients about yourself..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Brand Color
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                name="brandColor"
                defaultValue={settings?.brandColor || "#22c55e"}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300"
              />
              <span className="text-sm text-gray-500">
                Used for buttons, accents, and links
              </span>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            Contact Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              defaultValue={settings?.email || ""}
              className="input mt-1"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
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
              Website
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

        {/* Timezone */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Preferences</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <select
              name="timezone"
              defaultValue={settings?.timezone || "America/New_York"}
              className="input mt-1"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Central European</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
