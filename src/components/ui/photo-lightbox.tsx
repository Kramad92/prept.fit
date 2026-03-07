"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Columns2, Pencil } from "lucide-react";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";
import { PhotoComparison } from "@/components/ui/photo-comparison";
import { PhotoMetadata } from "@/components/ui/photo-metadata";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onUpdate?: (photoId: string, data: { caption?: string; category?: string | null }) => Promise<void>;
}

const CATEGORY_COLORS: Record<string, string> = {
  front: "bg-blue-500/80 text-white",
  back: "bg-purple-500/80 text-white",
  side: "bg-amber-500/80 text-white",
  other: "bg-gray-500/80 text-white",
};

export function CategoryChip({ category }: { category: string }) {
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

export function PhotoLightbox({ photos, initialIndex, onClose, onUpdate }: PhotoLightboxProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLoc = getDateLocale(locale);
  const [index, setIndex] = useState(initialIndex);
  const [compareMode, setCompareMode] = useState(false);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [pickingSide, setPickingSide] = useState<"left" | "right" | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);

  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editing) return;
      if (e.key === "Escape") {
        if (pickingSide) setPickingSide(null);
        else if (compareMode) setCompareMode(false);
        else onClose();
      }
      if (!compareMode) {
        if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
        if (e.key === "ArrowRight") setIndex((i) => Math.min(photos.length - 1, i + 1));
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [photos.length, onClose, compareMode, pickingSide, editing]);

  function startEdit() {
    setEditing(true);
  }

  function enterCompare() {
    setCompareMode(true);
    setEditing(false);
    const sorted = [...photos].sort(
      (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
    );
    setLeftId(sorted[0].id);
    setRightId(sorted[sorted.length - 1].id);
    setPickingSide(null);
    setCategoryFilter(null);
  }

  function exitCompare() {
    setCompareMode(false);
    setLeftId(null);
    setRightId(null);
    setPickingSide(null);
    setCategoryFilter(null);
  }

  function formatDateStr(d: string) {
    return new Date(d).toLocaleDateString(dateLoc, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // ─── Compare mode ───
  if (compareMode) {
    return (
      <PhotoComparison
        photos={photos}
        leftId={leftId}
        rightId={rightId}
        pickingSide={pickingSide}
        categoryFilter={categoryFilter}
        onSetLeftId={setLeftId}
        onSetRightId={setRightId}
        onSetPickingSide={setPickingSide}
        onSetCategoryFilter={setCategoryFilter}
        onExitCompare={exitCompare}
        onClose={onClose}
      />
    );
  }

  // ─── Single photo view ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {onUpdate && !editing && (
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-white/25"
          >
            <Pencil className="h-4 w-4" />
            {t.common.edit}
          </button>
        )}
        {photos.length >= 2 && !editing && (
          <button
            onClick={(e) => { e.stopPropagation(); enterCompare(); }}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-white/25"
          >
            <Columns2 className="h-4 w-4" />
            {t.photos.compare}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (editing) setEditing(false); else onClose(); }}
          className="rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!editing && index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index - 1); }}
          className="absolute left-4 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {!editing && index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(index + 1); }}
          className="absolute right-4 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <div className="flex max-h-[85vh] max-w-[90vw] flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={photo.url}
          alt={photo.caption || t.photos.progressPhoto}
          className="max-h-[70vh] max-w-full rounded-lg object-contain"
        />

        <PhotoMetadata
          key={`${photo.id}-${editing}`}
          photo={photo}
          editing={editing}
          onCancelEdit={() => setEditing(false)}
          onSave={async (data) => {
            if (!onUpdate) return;
            await onUpdate(photo.id, data);
            setEditing(false);
          }}
          formatDate={formatDateStr}
        />
      </div>

      {!editing && photos.length > 1 && (
        <div className="absolute bottom-4 flex gap-1.5">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === index ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
