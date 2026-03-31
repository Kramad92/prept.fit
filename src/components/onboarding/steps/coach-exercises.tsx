"use client";

import { useState, useEffect } from "react";
import { Download, Check, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StepProps } from "../onboarding-wizard";

interface FilterOption {
  name: string;
  count: number;
}

interface ImportFilters {
  total: number;
  difficulties: FilterOption[];
  equipment: FilterOption[];
  bodyRegions: FilterOption[];
  classifications: FilterOption[];
}

const DIFFICULTY_ORDER = [
  "Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master",
];

const EQUIPMENT_ORDER = [
  "Bodyweight", "Dumbbell", "Barbell", "Kettlebell", "Cable", "Resistance Band",
  "Pull Up Bar", "Stability Ball", "Medicine Ball",
];

function sortByOrder(options: FilterOption[], order: string[]): FilterOption[] {
  const orderMap = new Map(order.map((name, i) => [name.toLowerCase(), i]));
  return [...options].sort((a, b) => {
    const aIdx = orderMap.get(a.name.toLowerCase()) ?? 999;
    const bIdx = orderMap.get(b.name.toLowerCase()) ?? 999;
    if (aIdx !== bIdx) return aIdx - bIdx;
    return b.count - a.count;
  });
}

export function CoachExercises({ data, onUpdate }: StepProps) {
  const [filters, setFilters] = useState<ImportFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set(["Beginner", "Novice", "Intermediate"]));
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [selectedBodyRegions, setSelectedBodyRegions] = useState<Set<string>>(new Set());

  function buildQueryString() {
    const params = new URLSearchParams();
    if (selectedDifficulties.size > 0) params.set("difficulties", Array.from(selectedDifficulties).join(","));
    if (selectedEquipment.size > 0) params.set("equipment", Array.from(selectedEquipment).join(","));
    if (selectedBodyRegions.size > 0) params.set("bodyRegions", Array.from(selectedBodyRegions).join(","));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  useEffect(() => {
    fetch(`/api/exercise-library/import${buildQueryString()}`)
      .then((r) => r.json())
      .then((data) => {
        setFilters(data);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDifficulties, selectedEquipment, selectedBodyRegions]);

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, name: string) {
    const next = new Set(set);
    next.has(name) ? next.delete(name) : next.add(name);
    setFn(next);
  }

  async function handleImport() {
    setImporting(true);
    try {
      const res = await fetch("/api/exercise-library/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulties: selectedDifficulties.size > 0 ? Array.from(selectedDifficulties) : undefined,
          equipment: selectedEquipment.size > 0 ? Array.from(selectedEquipment) : undefined,
          bodyRegions: selectedBodyRegions.size > 0 ? Array.from(selectedBodyRegions) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) setResult(data);
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-gray-500">
        Loading exercise database...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-50">
          <Library className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Exercise Library</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Import exercises from our database to get started quickly. You can always add custom exercises later.
          </p>
        </div>
      </div>

      {result ? (
        <div className="mt-6 flex flex-col items-center rounded-lg bg-green-50 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <p className="mt-3 font-medium text-green-800">
            {result.imported} exercises imported!
          </p>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-green-600">
              {result.skipped} already in your library
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {/* Difficulty */}
          {filters && filters.difficulties.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Difficulty</h4>
              <div className="flex flex-wrap gap-1.5">
                {sortByOrder(filters.difficulties, DIFFICULTY_ORDER).map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => toggle(selectedDifficulties, setSelectedDifficulties, opt.name)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedDifficulties.has(opt.name)
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.name} ({opt.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {filters && filters.equipment.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Equipment</h4>
              <div className="flex flex-wrap gap-1.5">
                {sortByOrder(filters.equipment, EQUIPMENT_ORDER).slice(0, 12).map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => toggle(selectedEquipment, setSelectedEquipment, opt.name)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedEquipment.has(opt.name)
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.name} ({opt.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Body Region */}
          {filters && filters.bodyRegions.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">Body Region</h4>
              <div className="flex flex-wrap gap-1.5">
                {filters.bodyRegions.map((opt) => (
                  <button
                    key={opt.name}
                    onClick={() => toggle(selectedBodyRegions, setSelectedBodyRegions, opt.name)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selectedBodyRegions.has(opt.name)
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}
                  >
                    {opt.name} ({opt.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-gray-500">
              {(filters?.total ?? 0).toLocaleString()} exercises match
            </span>
            <Button onClick={handleImport} disabled={importing}>
              <Download className="mr-2 h-4 w-4" />
              {importing ? "Importing..." : "Import Exercises"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
