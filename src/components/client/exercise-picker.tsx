"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";

interface LibraryExercise {
  id: string;
  name: string;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
}

interface ExercisePickerProps {
  onSelect: (exercise: { name: string; exerciseLibraryId?: string }) => void;
}

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/exercise-library?search=${encodeURIComponent(query)}`)
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
          placeholder="Search exercises..."
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
            {results.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  onSelect({ name: ex.name, exerciseLibraryId: ex.id });
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{ex.name}</span>
                {ex.muscleGroup && (
                  <span className="text-xs text-gray-400">{ex.muscleGroup}</span>
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
            Add &quot;{query.trim()}&quot; as custom exercise
          </button>
        </div>
      )}
    </div>
  );
}
