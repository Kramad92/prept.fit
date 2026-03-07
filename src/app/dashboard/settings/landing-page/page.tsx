"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Globe,
  Plus,
  Trash2,
  Upload,
  ExternalLink,
  Award,
  Package,
  X,
  Star,
  GripVertical,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import type { Certificate, Package as PackageType } from "@/types";

interface LandingPageSettings {
  landingPageEnabled: boolean;
  coachPhoto: string | null;
  specialties: string[] | null;
  socialLinks: Record<string, string> | null;
}

export default function LandingPageSettingsPage() {
  const [settings, setSettings] = useState<LandingPageSettings | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState("");
  const { toastSuccess, toastError } = useToast();
  const t = useT();

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/landing-page").then((r) => r.json()),
      fetch("/api/settings/certificates").then((r) => r.json()),
      fetch("/api/settings/packages").then((r) => r.json()),
    ])
      .then(([s, c, p]) => {
        setSettings(s);
        setCertificates(Array.isArray(c) ? c : []);
        setPackages(Array.isArray(p) ? p : []);
      })
      .catch(() => toastError(t.settings.failedToLoad))
      .finally(() => setLoading(false));
  }, [toastError, t]);

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/landing-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) toastSuccess(t.landingPage.settingsSaved);
      else toastError(t.landingPage.failedToSave);
    } catch {
      toastError(t.landingPage.failedToSave);
    } finally {
      setSaving(false);
    }
  }

  function addSpecialty() {
    if (!newSpecialty.trim() || !settings) return;
    setSettings({
      ...settings,
      specialties: [...(settings.specialties || []), newSpecialty.trim()],
    });
    setNewSpecialty("");
  }

  function removeSpecialty(index: number) {
    if (!settings) return;
    const arr = [...(settings.specialties || [])];
    arr.splice(index, 1);
    setSettings({ ...settings, specialties: arr });
  }

  function updateSocialLink(key: string, value: string) {
    if (!settings) return;
    setSettings({
      ...settings,
      socialLinks: { ...(settings.socialLinks || {}), [key]: value },
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setSettings({ ...settings, coachPhoto: data.url });
      }
    } catch {
      toastError("Upload failed");
    }
  }

  // Certificate CRUD
  async function addCertificate() {
    try {
      const res = await fetch("/api/settings/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Certificate", orderIndex: certificates.length }),
      });
      if (res.ok) {
        const cert = await res.json();
        setCertificates([...certificates, cert]);
      }
    } catch {
      toastError(t.errors.failedToSave);
    }
  }

  async function updateCertificate(id: string, data: Partial<Certificate>) {
    const cert = certificates.find((c) => c.id === id);
    if (!cert) return;
    const updated = { ...cert, ...data };
    try {
      await fetch(`/api/settings/certificates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setCertificates(certificates.map((c) => (c.id === id ? updated : c)));
    } catch {
      toastError(t.errors.failedToSave);
    }
  }

  async function deleteCertificate(id: string) {
    try {
      await fetch(`/api/settings/certificates/${id}`, { method: "DELETE" });
      setCertificates(certificates.filter((c) => c.id !== id));
    } catch {
      toastError(t.errors.failedToDelete);
    }
  }

  // Package CRUD
  async function addPackage() {
    try {
      const res = await fetch("/api/settings/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "New Package",
          price: 0,
          orderIndex: packages.length,
        }),
      });
      if (res.ok) {
        const pkg = await res.json();
        setPackages([...packages, pkg]);
      }
    } catch {
      toastError(t.errors.failedToSave);
    }
  }

  async function updatePackage(id: string, data: Partial<PackageType>) {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;
    const updated = { ...pkg, ...data };
    try {
      await fetch(`/api/settings/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setPackages(packages.map((p) => (p.id === id ? updated : p)));
    } catch {
      toastError(t.errors.failedToSave);
    }
  }

  async function deletePackage(id: string) {
    try {
      await fetch(`/api/settings/packages/${id}`, { method: "DELETE" });
      setPackages(packages.filter((p) => p.id !== id));
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

  if (!settings) return null;

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        {t.availability.backToSettings}
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.settings.landingPage}</h1>
          <p className="mt-1 text-sm text-gray-500">{t.settings.landingPageDesc}</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
        >
          <ExternalLink className="h-4 w-4" />
          {t.landingPage.previewPage}
        </a>
      </div>

      <div className="mt-6 max-w-2xl space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-gray-900">{t.landingPage.enableLandingPage}</p>
                <p className="text-sm text-gray-500">
                  {settings.landingPageEnabled
                    ? "Your public page is live"
                    : "Your public page is hidden"}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setSettings({ ...settings, landingPageEnabled: !settings.landingPageEnabled })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.landingPageEnabled ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                  settings.landingPageEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Coach Photo */}
        <div className="card space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {t.landingPage.coachPhoto}
          </h3>
          <div className="flex items-center gap-4">
            {settings.coachPhoto ? (
              <img
                src={settings.coachPhoto}
                alt="Coach"
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div>
              <label className="btn-secondary cursor-pointer inline-flex items-center gap-1 text-sm">
                <Upload className="h-4 w-4" />
                {t.landingPage.uploadPhoto}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              {settings.coachPhoto && (
                <button
                  onClick={() => setSettings({ ...settings, coachPhoto: null })}
                  className="ml-2 text-sm text-red-500 hover:text-red-700"
                >
                  {t.common.delete}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Specialties */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{t.landingPage.specialties}</h3>
          <div className="flex flex-wrap gap-2">
            {(settings.specialties || []).map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700"
              >
                {s}
                <button onClick={() => removeSpecialty(i)} className="hover:text-red-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSpecialty}
              onChange={(e) => setNewSpecialty(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialty())}
              placeholder={t.landingPage.specialtyPlaceholder}
              className="input flex-1"
            />
            <button onClick={addSpecialty} className="btn-secondary">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Social Links */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{t.landingPage.socialLinks}</h3>
          {["instagram", "facebook", "youtube", "tiktok", "twitter", "linkedin"].map((platform) => (
            <div key={platform} className="flex items-center gap-2">
              <label className="w-24 text-sm capitalize text-gray-600">{platform}</label>
              <input
                type="url"
                value={settings.socialLinks?.[platform] || ""}
                onChange={(e) => updateSocialLink(platform, e.target.value)}
                placeholder={`https://${platform}.com/...`}
                className="input flex-1"
              />
            </div>
          ))}
        </div>

        {/* Certificates */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Award className="h-4 w-4" />
              {t.landingPage.certificates}
            </h3>
            <button onClick={addCertificate} className="btn-secondary text-xs">
              <Plus className="mr-1 h-3 w-3" />
              {t.landingPage.addCertificate}
            </button>
          </div>
          {certificates.map((cert) => (
            <div key={cert.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <GripVertical className="mt-2 h-4 w-4 flex-shrink-0 text-gray-300" />
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertificate(cert.id, { name: e.target.value })}
                    onBlur={() => updateCertificate(cert.id, {})}
                    placeholder={t.landingPage.certificateName}
                    className="input w-full text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cert.issuer || ""}
                      onChange={(e) => updateCertificate(cert.id, { issuer: e.target.value })}
                      placeholder={t.landingPage.certificateIssuer}
                      className="input text-sm"
                    />
                    <input
                      type="number"
                      value={cert.year || ""}
                      onChange={(e) =>
                        updateCertificate(cert.id, {
                          year: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      placeholder={t.landingPage.certificateYear}
                      className="input text-sm"
                    />
                  </div>
                </div>
                <button onClick={() => deleteCertificate(cert.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Packages */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Package className="h-4 w-4" />
              {t.landingPage.pricing}
            </h3>
            <button onClick={addPackage} className="btn-secondary text-xs">
              <Plus className="mr-1 h-3 w-3" />
              {t.landingPage.addPackage}
            </button>
          </div>
          {packages.map((pkg) => (
            <div key={pkg.id} className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={pkg.name}
                    onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                    placeholder={t.landingPage.packageName}
                    className="input w-full text-sm"
                  />
                  <textarea
                    value={pkg.description || ""}
                    onChange={(e) => updatePackage(pkg.id, { description: e.target.value })}
                    placeholder={t.landingPage.packageDescription}
                    rows={2}
                    className="input w-full text-sm"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={pkg.price || ""}
                      onChange={(e) =>
                        updatePackage(pkg.id, { price: parseFloat(e.target.value) || 0 })
                      }
                      placeholder={t.landingPage.packagePrice}
                      className="input text-sm"
                    />
                    <input
                      type="text"
                      value={pkg.duration || ""}
                      onChange={(e) => updatePackage(pkg.id, { duration: e.target.value })}
                      placeholder={t.landingPage.packageDuration}
                      className="input text-sm"
                    />
                    <label className="flex items-center gap-1.5 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={pkg.isFeatured}
                        onChange={(e) => updatePackage(pkg.id, { isFeatured: e.target.checked })}
                        className="rounded"
                      />
                      <Star className="h-3 w-3" />
                      {t.landingPage.featured}
                    </label>
                  </div>
                  {/* Features list */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">
                      {t.landingPage.packageFeatures}
                    </label>
                    {(pkg.features || []).map((f, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <input
                          type="text"
                          value={f}
                          onChange={(e) => {
                            const features = [...(pkg.features || [])];
                            features[i] = e.target.value;
                            updatePackage(pkg.id, { features });
                          }}
                          className="input flex-1 text-sm"
                        />
                        <button
                          onClick={() => {
                            const features = [...(pkg.features || [])];
                            features.splice(i, 1);
                            updatePackage(pkg.id, { features });
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updatePackage(pkg.id, { features: [...(pkg.features || []), ""] })
                      }
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      + {t.landingPage.addFeature}
                    </button>
                  </div>
                </div>
                <button onClick={() => deletePackage(pkg.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <button onClick={saveSettings} disabled={saving} className="btn-primary">
          <Save className="mr-2 h-4 w-4" />
          {saving ? t.common.saving : t.settings.saveSettings}
        </button>
      </div>
    </div>
  );
}
