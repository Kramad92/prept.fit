"use client";

import { useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2, Filter } from "lucide-react";
import { CategoryChip } from "@/components/ui/photo-lightbox";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  takenAt: string;
  category: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  front: "bg-blue-500/80 text-white",
  back: "bg-purple-500/80 text-white",
  side: "bg-amber-500/80 text-white",
  other: "bg-gray-500/80 text-white",
};

function formatDate(d: string, loc: string) {
  return new Date(d).toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShort(d: string, loc: string) {
  return new Date(d).toLocaleDateString(loc, { month: "short", day: "numeric" });
}

interface PhotoComparisonProps {
  photos: Photo[];
  leftId: string | null;
  rightId: string | null;
  pickingSide: "left" | "right" | null;
  categoryFilter: string | null;
  onSetLeftId: (id: string | null) => void;
  onSetRightId: (id: string | null) => void;
  onSetPickingSide: (side: "left" | "right" | null) => void;
  onSetCategoryFilter: (category: string | null) => void;
  onExitCompare: () => void;
  onClose: () => void;
}

export function PhotoComparison({
  photos,
  leftId,
  rightId,
  pickingSide,
  categoryFilter,
  onSetLeftId,
  onSetRightId,
  onSetPickingSide,
  onSetCategoryFilter,
  onExitCompare,
  onClose,
}: PhotoComparisonProps) {
  const t = useT();
  const { locale } = useLocale();
  const dateLoc = getDateLocale(locale);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    photos.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [photos]);

  const filteredPhotos = useMemo(() => {
    if (!categoryFilter) return photos;
    return photos.filter((p) => p.category === categoryFilter);
  }, [photos, categoryFilter]);

  const leftPhoto = photos.find((p) => p.id === leftId) || null;
  const rightPhoto = photos.find((p) => p.id === rightId) || null;

  const leftIdx = filteredPhotos.findIndex((p) => p.id === leftId);
  const rightIdx = filteredPhotos.findIndex((p) => p.id === rightId);

  function cyclePhoto(side: "left" | "right", direction: -1 | 1) {
    const currentId = side === "left" ? leftId : rightId;
    const list = filteredPhotos;
    const currentIdx = list.findIndex((p) => p.id === currentId);
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= list.length) return;
    if (side === "left") onSetLeftId(list[nextIdx].id);
    else onSetRightId(list[nextIdx].id);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">
            {pickingSide
              ? (pickingSide === "left" ? t.photos.pickBefore : t.photos.pickAfter)
              : t.photos.beforeAfter}
          </h3>
          {categories.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-white/40" />
              <button
                onClick={() => onSetCategoryFilter(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === null
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {t.billing.all}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSetCategoryFilter(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    categoryFilter === cat
                      ? CATEGORY_COLORS[cat] || "bg-white/20 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {t.photos[cat as keyof typeof t.photos] || cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onExitCompare}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t.photos.singleView}
          </button>
          <button onClick={onClose} className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Side by side photos */}
      <div className="flex flex-1 gap-2 overflow-hidden px-4 pb-2">
        {/* Left (before) */}
        <div className="flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg">
            {leftIdx > 0 && !pickingSide && (
              <button
                onClick={() => cyclePhoto("left", -1)}
                className="absolute left-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {leftPhoto ? (
              <img
                src={leftPhoto.url}
                alt={t.photos.before}
                onClick={() => onSetPickingSide("left")}
                className={`max-h-full max-w-full cursor-pointer object-contain ${
                  pickingSide === "left" ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-black" : ""
                }`}
              />
            ) : (
              <button
                onClick={() => onSetPickingSide("left")}
                className="text-sm text-white/40 hover:text-white/60"
              >
                {t.photos.clickToSelect}
              </button>
            )}
            {leftIdx < filteredPhotos.length - 1 && !pickingSide && (
              <button
                onClick={() => cyclePhoto("left", 1)}
                className="absolute right-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">{t.photos.before}</p>
            {leftPhoto && (
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-white/80">{formatDate(leftPhoto.takenAt, dateLoc)}</p>
                {leftPhoto.category && <CategoryChip category={leftPhoto.category} />}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="h-full w-px bg-white/10" />
        </div>

        {/* Right (after) */}
        <div className="flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-lg">
            {rightIdx > 0 && !pickingSide && (
              <button
                onClick={() => cyclePhoto("right", -1)}
                className="absolute left-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {rightPhoto ? (
              <img
                src={rightPhoto.url}
                alt={t.photos.after}
                onClick={() => onSetPickingSide("right")}
                className={`max-h-full max-w-full cursor-pointer object-contain ${
                  pickingSide === "right" ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-black" : ""
                }`}
              />
            ) : (
              <button
                onClick={() => onSetPickingSide("right")}
                className="text-sm text-white/40 hover:text-white/60"
              >
                {t.photos.clickToSelect}
              </button>
            )}
            {rightIdx < filteredPhotos.length - 1 && !pickingSide && (
              <button
                onClick={() => cyclePhoto("right", 1)}
                className="absolute right-2 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">{t.photos.after}</p>
            {rightPhoto && (
              <div className="flex items-center justify-center gap-2">
                <p className="text-sm text-white/80">{formatDate(rightPhoto.takenAt, dateLoc)}</p>
                {rightPhoto.category && <CategoryChip category={rightPhoto.category} />}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="border-t border-white/10 px-4 py-3">
        {pickingSide && (
          <p className="mb-2 text-center text-xs text-white/50">
            {pickingSide === "left" ? t.photos.tapToSetBefore : t.photos.tapToSetAfter}
          </p>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredPhotos.map((p) => {
            const isLeft = p.id === leftId;
            const isRight = p.id === rightId;

            return (
              <button
                key={p.id}
                onClick={() => {
                  if (pickingSide === "left") {
                    onSetLeftId(p.id);
                    onSetPickingSide(null);
                  } else if (pickingSide === "right") {
                    onSetRightId(p.id);
                    onSetPickingSide(null);
                  } else {
                    onSetPickingSide("left");
                  }
                }}
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                  isLeft
                    ? "border-blue-400"
                    : isRight
                      ? "border-green-400"
                      : pickingSide
                        ? "border-transparent hover:border-white/50"
                        : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 text-[10px] text-white">
                  {formatShort(p.takenAt, dateLoc)}
                </span>
                {(isLeft || isRight) && (
                  <span
                    className={`absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white ${
                      isLeft ? "bg-blue-500" : "bg-green-500"
                    }`}
                  >
                    {isLeft ? "B" : "A"}
                  </span>
                )}
                {p.category && (
                  <span className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[9px] capitalize text-white/80">
                    {t.photos[p.category as keyof typeof t.photos] || p.category}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
