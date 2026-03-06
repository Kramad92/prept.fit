"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Columns2, Maximize2 } from "lucide-react";

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

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [pickingSide, setPickingSide] = useState<"left" | "right" | null>(null);

  const photo = photos[index];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(photos.length - 1, i + 1));
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [photos.length, onClose]);

  function enterCompare() {
    setCompareMode(true);
    // Default: pick the first and last photo for before/after
    setCompareIndex(photos.length > 1 ? photos.length - 1 : 0);
    setIndex(0);
    setPickingSide(null);
  }

  function exitCompare() {
    setCompareMode(false);
    setCompareIndex(null);
    setPickingSide(null);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

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

        {/* Nav arrows */}
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

        {/* Photo */}
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

        {/* Dots */}
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
  const leftPhoto = photos[index];
  const rightPhoto = compareIndex !== null ? photos[compareIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-medium text-white">
          {pickingSide
            ? `Select ${pickingSide === "left" ? "before" : "after"} photo`
            : "Before & After"}
        </h3>
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

      {/* Side by side */}
      <div className="flex flex-1 gap-2 overflow-hidden px-4 pb-4">
        {/* Left (before) */}
        <div className="flex flex-1 flex-col">
          <div
            onClick={() => setPickingSide("left")}
            className={`relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg ${
              pickingSide === "left" ? "ring-2 ring-brand-500" : ""
            }`}
          >
            <img
              src={leftPhoto.url}
              alt="Before"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">Before</p>
            <p className="text-sm text-white/80">{formatDate(leftPhoto.takenAt)}</p>
            {leftPhoto.category && (
              <span className="text-xs capitalize text-white/50">{leftPhoto.category}</span>
            )}
          </div>
        </div>

        {/* Right (after) */}
        <div className="flex flex-1 flex-col">
          <div
            onClick={() => setPickingSide("right")}
            className={`relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg ${
              pickingSide === "right" ? "ring-2 ring-brand-500" : ""
            }`}
          >
            {rightPhoto ? (
              <img
                src={rightPhoto.url}
                alt="After"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p className="text-sm text-white/40">Select a photo</p>
            )}
          </div>
          <div className="mt-2 text-center">
            <p className="text-xs font-medium uppercase tracking-wider text-white/50">After</p>
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

      {/* Thumbnail strip for picking */}
      {pickingSide && (
        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => {
                  if (pickingSide === "left") setIndex(i);
                  else setCompareIndex(i);
                  setPickingSide(null);
                }}
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  (pickingSide === "left" && i === index) ||
                  (pickingSide === "right" && i === compareIndex)
                    ? "border-brand-500"
                    : "border-transparent hover:border-white/30"
                }`}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 text-[10px] text-white">
                  {new Date(p.takenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
