"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, Ruler, TrendingDown, TrendingUp, BarChart3, Plus, X, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { PhotoLightbox, CategoryChip } from "@/components/ui/photo-lightbox";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";

interface ProgressPhoto {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

interface Measurement {
  id: string;
  date: string;
  weight: number | null;
  bodyFat: number | null;
  chest: number | null;
  waist: number | null;
  hips: number | null;
  arms: number | null;
  thighs: number | null;
  notes: string | null;
}

export default function PortalProgressPage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = getDateLocale(locale);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"photos" | "stats">("photos");
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function loadData() {
    fetch("/api/portal/me")
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.progressPhotos || []);
        setMeasurements(data.measurements || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []);

  async function handlePhotoUploaded(key: string) {
    const res = await fetch("/api/portal/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, caption, category: category || null }),
    });
    if (res.ok) {
      setShowUpload(false);
      setCaption("");
      setCategory("");
      loadData();
    }
  }

  async function handlePhotoUpdate(photoId: string, data: { caption?: string; category?: string | null }) {
    await fetch("/api/portal/photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId, ...data }),
    });
    loadData();
  }

  async function handlePhotoDelete(photoId: string) {
    await fetch(`/api/portal/photos?photoId=${photoId}`, { method: "DELETE" });
    loadData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // Calculate weight trend
  const weightTrend =
    measurements.length >= 2 && measurements[0].weight && measurements[1].weight
      ? measurements[0].weight - measurements[1].weight
      : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.portal.progress}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.portal.trackJourney}
          </p>
        </div>
        <Link href="/portal/progress/charts" className="btn-secondary">
          <BarChart3 className="mr-1.5 h-4 w-4" />
          {t.nav.charts}
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("photos")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "photos"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Camera className="h-4 w-4" />
          {t.clients.photos}
        </button>
        <button
          onClick={() => setTab("stats")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            tab === "stats"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Ruler className="h-4 w-4" />
          {t.measurements.title}
        </button>
      </div>

      <div className="mt-6">
        {tab === "photos" && (
          <>
            <div className="mb-4 flex justify-end">
              {!showUpload && (
                <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
                  <Plus className="mr-1 h-4 w-4" />
                  {t.photos.upload}
                </button>
              )}
            </div>

            {showUpload && (
              <div className="card mb-4 border-2 border-brand-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">{t.photos.uploadProgress}</h4>
                  <button onClick={() => setShowUpload(false)} className="rounded p-1 hover:bg-gray-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3">
                  <ImageUploader folder="progress" onUploaded={handlePhotoUploaded} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">{t.photos.category}</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="input mt-0.5 text-sm">
                      <option value="">{t.photos.selectCategory}</option>
                      <option value="front">{t.photos.front}</option>
                      <option value="back">{t.photos.back}</option>
                      <option value="side">{t.photos.side}</option>
                      <option value="other">{t.photos.other}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">{t.photos.caption}</label>
                    <input type="text" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t.photos.captionPlaceholder} className="input mt-0.5 text-sm" />
                  </div>
                </div>
              </div>
            )}

            {photos.length === 0 && !showUpload ? (
              <div className="card flex flex-col items-center py-10 text-center">
                <Camera className="h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  {t.photos.noPhotos} {t.photos.uploadFirst}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {photos.map((photo, i) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl transition-transform hover:scale-[1.02]"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || t.photos.progressPhoto}
                      onClick={() => setLightboxIndex(i)}
                      className="h-full w-full object-cover"
                    />
                    {photo.category && (
                      <div className="absolute left-2 top-2">
                        <CategoryChip category={photo.category} />
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePhotoDelete(photo.id); }}
                      className="absolute right-2 top-2 hidden rounded-full bg-black/50 p-1.5 text-white hover:bg-red-600 group-hover:block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-xs text-white">
                        {new Date(photo.takenAt).toLocaleDateString(dateLocale, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {photo.caption && (
                        <p className="truncate text-xs text-white/70">{photo.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {lightboxIndex !== null && (
          <PhotoLightbox
            photos={photos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onUpdate={handlePhotoUpdate}
          />
        )}

        {tab === "stats" && (
          <>
            {measurements.length === 0 ? (
              <div className="card flex flex-col items-center py-10 text-center">
                <Ruler className="h-12 w-12 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  {t.portal.noMeasurements}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Weight Trend Card */}
                {measurements[0].weight && (
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">{t.portal.currentWeight}</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {measurements[0].weight}
                        </p>
                      </div>
                      {weightTrend !== null && (
                        <div
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                            weightTrend < 0
                              ? "bg-green-100 text-green-700"
                              : weightTrend > 0
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {weightTrend < 0 ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <TrendingUp className="h-4 w-4" />
                          )}
                          {Math.abs(weightTrend).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Measurement History */}
                <h3 className="text-sm font-semibold text-gray-700">{t.portal.history}</h3>
                {measurements.map((m) => (
                  <div key={m.id} className="card">
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(m.date).toLocaleDateString(dateLocale, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-4">
                      {m.weight && (
                        <div>
                          <span className="text-gray-400">{t.measurements.weight}:</span>{" "}
                          <span className="font-medium">{m.weight}</span>
                        </div>
                      )}
                      {m.bodyFat && (
                        <div>
                          <span className="text-gray-400">{t.measurements.bodyFat}:</span>{" "}
                          <span className="font-medium">{m.bodyFat}%</span>
                        </div>
                      )}
                      {m.chest && (
                        <div>
                          <span className="text-gray-400">{t.measurements.chest}:</span>{" "}
                          <span className="font-medium">{m.chest}</span>
                        </div>
                      )}
                      {m.waist && (
                        <div>
                          <span className="text-gray-400">{t.measurements.waist}:</span>{" "}
                          <span className="font-medium">{m.waist}</span>
                        </div>
                      )}
                      {m.hips && (
                        <div>
                          <span className="text-gray-400">{t.measurements.hips}:</span>{" "}
                          <span className="font-medium">{m.hips}</span>
                        </div>
                      )}
                      {m.arms && (
                        <div>
                          <span className="text-gray-400">{t.measurements.arms}:</span>{" "}
                          <span className="font-medium">{m.arms}</span>
                        </div>
                      )}
                      {m.thighs && (
                        <div>
                          <span className="text-gray-400">{t.measurements.thighs}:</span>{" "}
                          <span className="font-medium">{m.thighs}</span>
                        </div>
                      )}
                    </div>
                    {m.notes && (
                      <p className="mt-2 text-sm italic text-gray-400">
                        {m.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
