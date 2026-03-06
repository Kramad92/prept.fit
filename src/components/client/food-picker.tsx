"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Database, Star, Save, Loader2, Check, X } from "lucide-react";

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
}

interface SelectedFood {
  name: string;
  basePortion: string;
  baseGrams: number;
  baseCalories: number | null;
  baseProtein: number | null;
  baseCarbs: number | null;
  baseFat: number | null;
  fdcId?: number;
}

interface FoodPickerProps {
  onSelect: (food: {
    name: string;
    portion?: string;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  }) => void;
}

function parseGrams(portion: string): number {
  const match = portion.match(/^(\d+(?:\.\d+)?)\s*g?$/i);
  return match ? parseFloat(match[1]) : 100;
}

function scaleNutrient(base: number | null, ratio: number): number | null {
  if (base == null) return null;
  return Math.round(base * ratio);
}

export function FoodPicker({ onSelect }: FoodPickerProps) {
  const [query, setQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<LibraryFood[]>([]);
  const [usdaResults, setUsdaResults] = useState<USDAFood[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedFood | null>(null);
  const [portionInput, setPortionInput] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const portionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
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
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (selected && portionRef.current) {
      portionRef.current.focus();
      portionRef.current.select();
    }
  }, [selected]);

  function stageFood(food: {
    name: string;
    portion: string;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fdcId?: number;
  }) {
    const baseGrams = parseGrams(food.portion);
    setSelected({
      name: food.name,
      basePortion: food.portion,
      baseGrams,
      baseCalories: food.calories,
      baseProtein: food.protein,
      baseCarbs: food.carbs,
      baseFat: food.fat,
      fdcId: food.fdcId,
    });
    setPortionInput(baseGrams.toString());
  }

  function confirmSelection() {
    if (!selected) return;
    const grams = parseFloat(portionInput) || selected.baseGrams;
    const ratio = grams / selected.baseGrams;
    onSelect({
      name: selected.name,
      portion: `${grams}g`,
      calories: scaleNutrient(selected.baseCalories, ratio),
      protein: scaleNutrient(selected.baseProtein, ratio),
      carbs: scaleNutrient(selected.baseCarbs, ratio),
      fat: scaleNutrient(selected.baseFat, ratio),
    });
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  function selectCustomFood(name: string) {
    onSelect({ name });
    setQuery("");
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

  // If a food is staged for portion input, show the portion editor
  if (selected) {
    const grams = parseFloat(portionInput) || selected.baseGrams;
    const ratio = grams / selected.baseGrams;
    const scaledCal = scaleNutrient(selected.baseCalories, ratio);
    const scaledP = scaleNutrient(selected.baseProtein, ratio);
    const scaledC = scaleNutrient(selected.baseCarbs, ratio);
    const scaledF = scaleNutrient(selected.baseFat, ratio);

    return (
      <div ref={wrapperRef} className="rounded-lg border border-brand-200 bg-brand-50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900">{selected.name}</p>
          <button
            onClick={() => setSelected(null)}
            className="rounded p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-0.5 text-xs text-gray-500">
          Base: {selected.basePortion} = {macroLabel(selected.baseCalories, selected.baseProtein, selected.baseCarbs, selected.baseFat)}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={portionRef}
              type="number"
              value={portionInput}
              onChange={(e) => setPortionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmSelection();
                }
              }}
              className="input w-20 text-center text-sm"
              min="1"
            />
            <span className="text-sm text-gray-500">g</span>
          </div>
          <div className="flex-1 text-xs text-gray-500">
            {macroLabel(scaledCal, scaledP, scaledC, scaledF)}
          </div>
          <button
            onClick={confirmSelection}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
          >
            <Check className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search foods (e.g. chicken breast, rice)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="input pl-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-72 overflow-y-auto">
            {/* Custom library results */}
            {libraryResults.length > 0 && (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  <Star className="h-3 w-3" />
                  Your Foods
                </div>
                {libraryResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() =>
                      stageFood({
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

            {/* USDA results */}
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
                      onClick={() =>
                        stageFood({
                          name: food.name,
                          portion: food.portion,
                          calories: food.calories,
                          protein: food.protein,
                          carbs: food.carbs,
                          fat: food.fat,
                          fdcId: food.fdcId,
                        })
                      }
                      className="flex flex-1 items-center justify-between text-left text-sm"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-gray-900 line-clamp-1">
                          {food.name.length > 50
                            ? food.name.slice(0, 50) + "..."
                            : food.name}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">{food.portion}</span>
                      </div>
                      <span className="ml-2 flex-shrink-0 text-xs text-gray-400">
                        {macroLabel(food.calories, food.protein, food.carbs, food.fat)}
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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

          {/* Custom entry */}
          <button
            onClick={() => selectCustomFood(query.trim())}
            className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-brand-600 hover:bg-brand-50"
          >
            <Plus className="h-4 w-4" />
            Add &quot;{query.trim()}&quot; as custom food
          </button>
        </div>
      )}
    </div>
  );
}
