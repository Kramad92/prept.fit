"use client";

import { useState, useEffect, useRef } from "react";
import type { LibraryExercise } from "@/types";
import { useT, useTV } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ExerciseNameInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  [key: `data-${string}`]: string | undefined;
}

export function ExerciseNameInput({ value, onChange, placeholder, className, onKeyDown, ...rest }: ExerciseNameInputProps) {
  const t = useT();
  const tv = useTV();
  const [results, setResults] = useState<LibraryExercise[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value.trim() || value.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/exercise-library?search=${encodeURIComponent(value)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [value]);

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
    <div ref={wrapperRef} className="relative flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder || t.workouts.exerciseName}
        className={cn(
          "block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 flex-1",
          className
        )}
        {...rest}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  onChange(ex.name);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{ex.name}</span>
                <span className="text-xs text-gray-400">
                  {[ex.muscleGroup ? tv("muscleGroups", ex.muscleGroup) : null, ex.equipment ? tv("equipment", ex.equipment) : null].filter(Boolean).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
