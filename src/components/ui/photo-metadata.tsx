"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

const CATEGORIES = ["front", "back", "side", "other"];

const CATEGORY_COLORS: Record<string, string> = {
  front: "bg-blue-500/80 text-white",
  back: "bg-purple-500/80 text-white",
  side: "bg-amber-500/80 text-white",
  other: "bg-gray-500/80 text-white",
};

interface PhotoMetadataProps {
  photo: Photo;
  editing: boolean;
  onCancelEdit: () => void;
  onSave: (data: { caption?: string; category?: string | null }) => Promise<void>;
  formatDate: (d: string) => string;
}

export function PhotoMetadata({ photo, editing, onCancelEdit, onSave, formatDate }: PhotoMetadataProps) {
  const t = useT();
  const [editCaption, setEditCaption] = useState(photo.caption || "");
  const [editCategory, setEditCategory] = useState<string>(photo.category || "");
  const [saving, setSaving] = useState(false);

  // Reset edit fields when the photo changes or editing starts
  // This is handled by the parent re-mounting via key prop

  async function handleSave() {
    setSaving(true);
    await onSave({
      caption: editCaption || undefined,
      category: editCategory || null,
    });
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="mt-3 w-full max-w-md space-y-3 rounded-lg bg-white/10 p-4 backdrop-blur-sm">
        <div>
          <label className="text-xs font-medium text-white/60">{t.photos.category}</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              onClick={() => setEditCategory("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                !editCategory
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {t.photos.none}
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setEditCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  editCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {t.photos[cat as keyof typeof t.photos] || cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-white/60">{t.photos.captionNotes}</label>
          <input
            type="text"
            value={editCaption}
            onChange={(e) => setEditCaption(e.target.value)}
            placeholder={t.photos.addNote}
            className="mt-1 w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancelEdit}
            className="flex-1 rounded-lg bg-white/10 py-2 text-sm text-white hover:bg-white/20"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? t.common.saving : t.common.save}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <p className="text-sm text-white/80">{formatDate(photo.takenAt)}</p>
        {photo.category && <CategoryChipInternal category={photo.category} />}
      </div>
      {photo.caption && (
        <p className="mt-1 text-sm text-white/70">{photo.caption}</p>
      )}
    </div>
  );
}

/** Internal CategoryChip used only within this file — the shared one is exported from photo-lightbox.tsx */
function CategoryChipInternal({ category }: { category: string }) {
  const t = useT();
  const label = t.photos[category as keyof typeof t.photos] || category;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        CATEGORY_COLORS[category] || CATEGORY_COLORS.other
      }`}
    >
      {label}
    </span>
  );
}
