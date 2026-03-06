"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Database, Star, Save, Loader2 } from "lucide-react";

interface LibraryFood {
  id: string;
  name: string;
  defaultPortion: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  category: string | null;
}

interface USDAFood {
  fdcId: number;
  name: string;
  portion: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  source: "usda";
  unitLabel?: string;
  gramsPerUnit?: number;
}

export interface FoodResult {
  name: string;
  portion?: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  unitLabel?: string;
  gramsPerUnit?: number;
}

interface FoodPickerProps {
  onSelect: (food: FoodResult) => void;
  /** "standalone" = search bar with icon (default). "inline" = compact input that fits in a row. */
  variant?: "standalone" | "inline";
  /** Class name for the input element */
  inputClassName?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Pre-fill the input (for editing existing foods) */
  initialValue?: string;
}

export function FoodPicker({
  onSelect,
  variant = "standalone",
  inputClassName,
  placeholder,
  initialValue,
}: FoodPickerProps) {
  const [query, setQuery] = useState(initialValue || "");
  const [libraryResults, setLibraryResults] = useState<LibraryFood[]>([]);
  const [usdaResults, setUsdaResults] = useState<USDAFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isInline = variant === "inline";

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || query === initialValue) {
      setLibraryResults([]);
      setUsdaResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      const encoded = encodeURIComponent(query.trim());

      Promise.all([
        fetch(`/api/food-library?search=${encoded}`)
          .then((r) => r.json())
          .catch(() => []),
        fetch(`/api/food-search?q=${encoded}`)
          .then((r) => r.json())
          .then((d) => (Array.isArray(d) ? d : []))
          .catch(() => []),
      ]).then(([library, usda]) => {
        setLibraryResults(library);
        setUsdaResults(usda);
        setLoading(false);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectFood(food: FoodResult) {
    onSelect(food);
    setQuery(initialValue !== undefined ? food.name : "");
    setOpen(false);
  }

  async function saveToLibrary(food: USDAFood) {
    setSaving(food.fdcId);
    try {
      await fetch("/api/food-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: food.name,
          defaultPortion: food.portion,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
        }),
      });
    } catch {
      // silent
    }
    setSaving(null);
  }

  function macroLabel(cal: number | null, p: number | null, c: number | null, f: number | null) {
    const parts = [];
    if (cal != null) parts.push(`${cal} cal`);
    if (p != null) parts.push(`${p}g P`);
    if (c != null) parts.push(`${c}g C`);
    if (f != null) parts.push(`${f}g F`);
    return parts.join(" · ");
  }

  const hasResults = libraryResults.length > 0 || usdaResults.length > 0;

  const dropdown = open && query.trim().length >= 2 && (
    <div className={`absolute z-20 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg ${isInline ? "left-0 right-0 min-w-0 md:right-auto md:min-w-[28rem]" : "w-full"}`}>
      <div className="max-h-48 overflow-y-auto md:max-h-72">
        {libraryResults.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              <Star className="h-3 w-3" />
              Your Foods
            </div>
            {libraryResults.map((food) => (
              <button
                type="button"
                key={food.id}
                onClick={() =>
                  selectFood({
                    name: food.name,
                    portion: food.defaultPortion || "100g",
                    calories: food.calories,
                    protein: food.protein,
                    carbs: food.carbs,
                    fat: food.fat,
                  })
                }
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
              >
                <div>
                  <span className="font-medium text-gray-900">{food.name}</span>
                  {food.defaultPortion && (
                    <span className="ml-2 text-xs text-gray-400">{food.defaultPortion}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {macroLabel(food.calories, food.protein, food.carbs, food.fat)}
                </span>
              </button>
            ))}
          </>
        )}

        {usdaResults.length > 0 && (
          <>
            <div className="flex items-center gap-1.5 border-t border-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              <Database className="h-3 w-3" />
              USDA Database
            </div>
            {usdaResults.map((food) => (
              <div
                key={food.fdcId}
                className="flex items-center gap-1 px-3 py-2 hover:bg-gray-50"
              >
                <button
                  type="button"
                  onClick={() =>
                    selectFood({
                      name: food.name,
                      portion: food.portion,
                      calories: food.calories,
                      protein: food.protein,
                      carbs: food.carbs,
                      fat: food.fat,
                      unitLabel: food.unitLabel,
                      gramsPerUnit: food.gramsPerUnit,
                    })
                  }
                  className="flex flex-1 items-center justify-between text-left text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 line-clamp-1">
                      {food.name.length > 60
                        ? food.name.slice(0, 60) + "..."
                        : food.name}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{food.portion}</span>
                  </div>
                  <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                    {macroLabel(food.calories, food.protein, food.carbs, food.fat)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    saveToLibrary(food);
                  }}
                  title="Save to your food library"
                  className="ml-1 flex-shrink-0 rounded p-1 text-gray-300 hover:bg-brand-50 hover:text-brand-600"
                >
                  {saving === food.fdcId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </>
        )}

        {!loading && !hasResults && (
          <p className="px-3 py-4 text-center text-sm text-gray-400">
            No foods found
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => selectFood({ name: query.trim() })}
        className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50"
      >
        <Plus className="h-4 w-4" />
        Add &quot;{query.trim()}&quot; as custom food
      </button>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {!isInline && (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <input
          type="text"
          placeholder={placeholder || "Search foods (e.g. chicken breast, rice)..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={(e) => {
            if (query.trim().length >= 2) setOpen(true);
            // Scroll input into view on mobile when keyboard opens
            setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
          }}
          onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
          className={inputClassName || (isInline ? "input text-xs" : "input pl-10")}
        />
        {loading && (
          <Loader2 className={`absolute top-1/2 -translate-y-1/2 animate-spin text-gray-400 ${isInline ? "right-2 h-3 w-3" : "right-3 h-4 w-4"}`} />
        )}
      </div>
      {dropdown}
    </div>
  );
}
