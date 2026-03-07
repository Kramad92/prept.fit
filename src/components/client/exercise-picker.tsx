"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import type { LibraryExercise } from "@/types";
import { useT, useLocale } from "@/lib/i18n";

interface ExercisePickerProps {
  onSelect: (exercise: { name: string; exerciseLibraryId?: string }) => void;
}

interface CategoryItem {
  id: string;
  name: string;
}

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const t = useT();
  const { locale } = useLocale();

  function displayName(ex: LibraryExercise) {
    return locale !== "en" && ex.nameBs ? ex.nameBs : ex.name;
  }

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/exercise-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!query.trim() && !category) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("search", query.trim());
      if (category) params.set("category", category);
      fetch(`/api/exercise-library?${params}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [query, category]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown = open && (query.trim() || category);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder={t.exerciseLibrary.searchPlaceholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="input pl-10"
        />
      </div>

      {/* Category chips */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setCategory(category === cat.name ? "" : cat.name);
              setOpen(true);
            }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              category === cat.name
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {results.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">{t.exerciseLibrary.noExercisesFound}</p>
            )}
            {results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onSelect({ name: displayName(ex), exerciseLibraryId: ex.id });
                  setQuery("");
                  setCategory("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{displayName(ex)}</span>
                  {ex.equipment && (
                    <span className="text-xs text-gray-400">{ex.equipment}</span>
                  )}
                </div>
                {ex.muscleGroup && (
                  <span className="text-xs text-gray-400">{ex.muscleGroup}</span>
                )}
              </button>
            ))}
          </div>
          {query.trim() && (
            <button
              type="button"
              onClick={() => {
                onSelect({ name: query.trim() });
                setQuery("");
                setCategory("");
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50"
            >
              <Plus className="h-4 w-4" />
              {t.exerciseLibrary.addAsCustom}: &quot;{query.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
