"use client";

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { ImageUploader } from "@/components/ui/image-uploader";
import { PhotoLightbox, CategoryChip } from "@/components/ui/photo-lightbox";
import { useToast } from "@/components/ui/toast";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { api } from "@/lib/api";
import type { ProgressPhoto } from "@/types";

interface ClientPhotosTabProps {
  clientId: string;
  photos: ProgressPhoto[];
  onRefresh: () => void;
}

export function ClientPhotosTab({ clientId, photos, onRefresh }: ClientPhotosTabProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = getDateLocale(locale);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { toastSuccess, toastError } = useToast();

  const categories = ["front", "back", "side", "other"];

  async function handleUploaded(key: string) {
    try {
      await api.post(`/api/clients/${clientId}/photos`, { key, caption, category: category || null });
      toastSuccess(t.photos.photoUploaded);
      setShowUpload(false);
      setCaption("");
      setCategory("");
      onRefresh();
    } catch {
      toastError(t.photos.failedToSave);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await api.delete(`/api/clients/${clientId}/photos?photoId=${photoId}`);
      toastSuccess(t.photos.photoDeleted);
      onRefresh();
    } catch {
      toastError(t.photos.failedToDelete);
    }
  }

  async function handleUpdate(photoId: string, data: { caption?: string; category?: string | null }) {
    try {
      await api.patch(`/api/clients/${clientId}/photos`, { photoId, ...data });
      toastSuccess(t.photos.photoUpdated);
      onRefresh();
    } catch {
      toastError(t.photos.failedToSave);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.photos.title} ({photos.length})
        </h3>
        {!showUpload && (
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
            <Camera className="mr-1 h-4 w-4" />
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
            <ImageUploader folder="progress" onUploaded={handleUploaded} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">{t.photos.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input mt-0.5 text-sm"
              >
                <option value="">{t.photos.selectCategory}</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{t.photos[c as keyof typeof t.photos]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">{t.photos.caption}</label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t.photos.captionPlaceholder}
                className="input mt-0.5 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {photos.length === 0 && !showUpload ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <Camera className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">{t.photos.noPhotos}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg">
              <img
                src={photo.url}
                alt={photo.caption || "Progress photo"}
                onClick={() => setLightboxIndex(i)}
                className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-[1.02]"
              />
              {photo.category && (
                <div className="absolute left-2 top-2">
                  <CategoryChip category={photo.category} />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white">
                  {new Date(photo.takenAt).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                </p>
                {photo.caption && (
                  <p className="truncate text-xs text-white/70">{photo.caption}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(photo.id)}
                className="absolute right-2 top-2 hidden rounded-full bg-black/50 p-1 text-white hover:bg-red-600 group-hover:block"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}
