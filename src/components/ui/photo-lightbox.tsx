"use client";

import { useState, useEffect, useMemo } from "react";
import { X, ChevronLeft, ChevronRight, Columns2, Maximize2, Filter } from "lucide-react";

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
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [compareMode, setCompareMode] = useState(false);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [pickingSide, setPickingSide] = useState<"left" | "right" | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const photo = photos[index];

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    photos.forEach((p) => { if (p.category) cats.add(p.category); });
    return Array.from(cats).sort();
  }, [photos]);

  // Filtered photos for compare thumbnail strip
  const filteredPhotos = useMemo(() => {
    if (!categoryFilter) return photos;
    return photos.filter((p) => p.category === categoryFilter);
  }, [photos, categoryFilter]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
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
  }, [photos.length, onClose, compareMode, pickingSide]);

  function enterCompare() {
    setCompareMode(true);
    // Default: oldest as before, newest as after
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

  // Navigate within a side in compare mode
  function cyclePhoto(side: "left" | "right", direction: -1 | 1) {
    const currentId = side === "left" ? leftId : rightId;
    const list = filteredPhotos;
    const currentIdx = list.findIndex((p) => p.id === currentId);
    const nextIdx = currentIdx + direction;
    if (nextIdx < 0 || nextIdx >= list.length) return;
    if (side === "left") setLeftId(list[nextIdx].id);
    else setRightId(list[nextIdx].id);
  }

  const leftPhoto = photos.find((p) => p.id === leftId) || null;
  const rightPhoto = photos.find((p) => p.id === rightId) || null;

  // Single photo view
  if (!compareMode) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          {photos.length >= 2 && (
            <button
              onClick={(e) => { e.stopPropagation(); enterCompare(); }}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm text-white backdrop-blur-sm hover:bg-white/25"
            >
              <Columns2 className="h-4 w-4" />
              Compare
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIndex(index - 1); }}
            className="absolute left-4 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {index < photos.length - 1 && (
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
            alt={photo.caption || "Progress photo"}
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
          <div className="mt-3 text-center">
            <p className="text-sm text-white/80">{formatDate(photo.takenAt)}</p>
            {photo.category && (
              <span className="text-xs capitalize text-white/50">{photo.category}</span>
            )}
            {photo.caption && (
              <p className="mt-1 text-sm text-white/70">{photo.caption}</p>
            )}
          </div>
        </div>

        {photos.length > 1 && (
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

  // Compare mode
  const leftIdx = filteredPhotos.findIndex((p) => p.id === leftId);
  const rightIdx = filteredPhotos.findIndex((p) => p.id === rightId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-white">
            {pickingSide
              ? `Pick ${pickingSide === "left" ? "before" : "after"} photo`
              : "Before & After"}
          </h3>

          {/* Category filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-white/40" />
              <button
                onClick={() => setCategoryFilter(null)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  categoryFilter === null
                    ? "bg-white/20 text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                    categoryFilter === cat
                      ? "bg-white/20 text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={exitCompare}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Single View
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
            {/* Left arrow */}
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
                alt="Before"
                onClick={() => setPickingSide("left")}
                className={`max-h-full max-w-full cursor-pointer object-contain ${
                  pickingSide === "left" ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-black" : ""
                }`}
              />
            ) : (
              <button
                onClick={() => setPickingSide("left")}
                className="text-sm text-white/40 hover:text-white/60"
              >
                Click to select photo
              </button>
            )}
            {/* Right arrow */}
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
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">Before</p>
            {leftPhoto && (
              <>
                <p className="text-sm text-white/80">{formatDate(leftPhoto.takenAt)}</p>
                {leftPhoto.category && (
                  <span className="text-xs capitalize text-white/50">{leftPhoto.category}</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Divider */}
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
                alt="After"
                onClick={() => setPickingSide("right")}
                className={`max-h-full max-w-full cursor-pointer object-contain ${
                  pickingSide === "right" ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-black" : ""
                }`}
              />
            ) : (
              <button
                onClick={() => setPickingSide("right")}
                className="text-sm text-white/40 hover:text-white/60"
              >
                Click to select photo
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
            <p className="text-xs font-medium uppercase tracking-wider text-white/40">After</p>
            {rightPhoto && (
              <>
                <p className="text-sm text-white/80">{formatDate(rightPhoto.takenAt)}</p>
                {rightPhoto.category && (
                  <span className="text-xs capitalize text-white/50">{rightPhoto.category}</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail strip — always visible in compare mode */}
      <div className="border-t border-white/10 px-4 py-3">
        {pickingSide && (
          <p className="mb-2 text-center text-xs text-white/50">
            Tap a photo below to set it as the {pickingSide === "left" ? "before" : "after"} image
          </p>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredPhotos.map((p) => {
            const isLeft = p.id === leftId;
            const isRight = p.id === rightId;
            const isSelected = isLeft || isRight;

            return (
              <button
                key={p.id}
                onClick={() => {
                  if (pickingSide === "left") {
                    setLeftId(p.id);
                    setPickingSide(null);
                  } else if (pickingSide === "right") {
                    setRightId(p.id);
                    setPickingSide(null);
                  } else {
                    // Quick-pick: first click sets left, second sets right
                    setPickingSide("left");
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
                  {formatShort(p.takenAt)}
                </span>
                {isSelected && (
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
                    {p.category}
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
