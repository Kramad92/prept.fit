"use client";

import { useState } from "react";
import Link from "next/link";
import { Save, Palette, Clock, ChevronRight } from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

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

      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
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
                defaultValue="#22c55e"
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
            <select name="timezone" className="input mt-1">
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
          {saved && (
            <span className="text-sm text-green-600">Settings saved!</span>
          )}
        </div>
      </form>
    </div>
  );
}
