"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";

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

interface FoodPickerProps {
  onSelect: (food: { name: string; portion?: string; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null }) => void;
}

export function FoodPicker({ onSelect }: FoodPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryFood[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/food-library?search=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }, 200);
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

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search foods..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="input pl-10"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {results.map((food) => (
              <button
                key={food.id}
                onClick={() => {
                  onSelect({
                    name: food.name,
                    portion: food.defaultPortion || undefined,
                    calories: food.calories,
                    protein: food.protein,
                    carbs: food.carbs,
                    fat: food.fat,
                  });
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <div>
                  <span className="font-medium text-gray-900">{food.name}</span>
                  {food.defaultPortion && (
                    <span className="ml-2 text-xs text-gray-400">{food.defaultPortion}</span>
                  )}
                </div>
                {food.calories && (
                  <span className="text-xs text-gray-400">{food.calories} cal</span>
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              onSelect({ name: query.trim() });
              setQuery("");
              setOpen(false);
            }}
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
