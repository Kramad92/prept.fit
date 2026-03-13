"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

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

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  const allSelected = options.length > 0 && options.every((o) => selected.has(o.name));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-xs text-brand-600 hover:text-brand-700"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.has(opt.name);
          return (
            <button
              key={opt.name}
              onClick={() => onToggle(opt.name)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.name}
              <span className="ml-1 text-gray-400">({opt.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExerciseImportModal({ open, onClose, onImported }: Props) {
  const [filters, setFilters] = useState<ImportFilters | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<string>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set());
  const [selectedBodyRegions, setSelectedBodyRegions] = useState<Set<string>>(new Set());
  const [selectedClassifications, setSelectedClassifications] = useState<Set<string>>(new Set());

  function buildQueryString() {
    const params = new URLSearchParams();
    if (selectedDifficulties.size > 0) params.set("difficulties", Array.from(selectedDifficulties).join(","));
    if (selectedEquipment.size > 0) params.set("equipment", Array.from(selectedEquipment).join(","));
    if (selectedBodyRegions.size > 0) params.set("bodyRegions", Array.from(selectedBodyRegions).join(","));
    if (selectedClassifications.size > 0) params.set("classifications", Array.from(selectedClassifications).join(","));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  // Fetch filters on open and whenever selections change
  useEffect(() => {
    if (!open) return;
    setResult(null);
    const isInitial = !filters;
    if (isInitial) setLoading(true);
    fetch(`/api/exercise-library/import${buildQueryString()}`)
      .then((r) => r.json())
      .then((data) => {
        setFilters(data);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDifficulties, selectedEquipment, selectedBodyRegions, selectedClassifications]);

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, name: string) {
    const next = new Set(set);
    next.has(name) ? next.delete(name) : next.add(name);
    setFn(next);
  }

  function getMatchCount(): number {
    return filters?.total ?? 0;
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/exercise-library/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          difficulties: selectedDifficulties.size > 0 ? Array.from(selectedDifficulties) : undefined,
          equipment: selectedEquipment.size > 0 ? Array.from(selectedEquipment) : undefined,
          bodyRegions: selectedBodyRegions.size > 0 ? Array.from(selectedBodyRegions) : undefined,
          classifications: selectedClassifications.size > 0 ? Array.from(selectedClassifications) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (data.imported > 0) onImported();
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Exercise Database</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading exercise database...</p>
        ) : filters ? (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              Choose which exercises to add to your library. Select the categories
              that match your coaching style and equipment. Leave a section empty to include all.
            </p>

            <FilterSection
              title="Difficulty Level"
              options={filters.difficulties}
              selected={selectedDifficulties}
              onToggle={(n) => toggle(selectedDifficulties, setSelectedDifficulties, n)}
              onSelectAll={() => setSelectedDifficulties(new Set(filters.difficulties.map((o) => o.name)))}
              onDeselectAll={() => setSelectedDifficulties(new Set())}
            />

            <FilterSection
              title="Equipment"
              options={filters.equipment}
              selected={selectedEquipment}
              onToggle={(n) => toggle(selectedEquipment, setSelectedEquipment, n)}
              onSelectAll={() => setSelectedEquipment(new Set(filters.equipment.map((o) => o.name)))}
              onDeselectAll={() => setSelectedEquipment(new Set())}
            />

            <FilterSection
              title="Body Region"
              options={filters.bodyRegions}
              selected={selectedBodyRegions}
              onToggle={(n) => toggle(selectedBodyRegions, setSelectedBodyRegions, n)}
              onSelectAll={() => setSelectedBodyRegions(new Set(filters.bodyRegions.map((o) => o.name)))}
              onDeselectAll={() => setSelectedBodyRegions(new Set())}
            />

            <FilterSection
              title="Training Style"
              options={filters.classifications}
              selected={selectedClassifications}
              onToggle={(n) => toggle(selectedClassifications, setSelectedClassifications, n)}
              onSelectAll={() => setSelectedClassifications(new Set(filters.classifications.map((o) => o.name)))}
              onDeselectAll={() => setSelectedClassifications(new Set())}
            />

            {result && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                Imported {result.imported} exercises.
                {result.skipped > 0 && ` (${result.skipped} already in your library)`}
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-gray-500">
                {getMatchCount().toLocaleString()} exercises
              </span>
              <Button onClick={handleImport} disabled={importing}>
                <Download className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : "Import Selected"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
