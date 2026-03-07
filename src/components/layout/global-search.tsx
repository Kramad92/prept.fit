"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Dumbbell, Library, UtensilsCrossed, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

interface SearchResults {
  clients: { id: string; name: string; email: string | null; status: string }[];
  exercises: { id: string; name: string; nameBs: string | null; category: string | null; muscleGroup: string | null }[];
  workoutPlans: { id: string; name: string; description: string | null }[];
  mealPlans: { id: string; name: string; description: string | null }[];
}

interface SearchItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  category: string;
  icon: typeof Users;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const t = useT();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
      const items: SearchItem[] = [];

      for (const c of data.clients) {
        items.push({
          id: c.id,
          label: c.name,
          sublabel: c.email || undefined,
          href: `/dashboard/clients/${c.id}`,
          category: t.nav.clients,
          icon: Users,
        });
      }
      for (const ex of data.exercises) {
        items.push({
          id: ex.id,
          label: ex.nameBs || ex.name,
          sublabel: [ex.category, ex.muscleGroup].filter(Boolean).join(" / "),
          href: `/dashboard/exercises?highlight=${ex.id}`,
          category: t.nav.exerciseLibrary,
          icon: Library,
        });
      }
      for (const wp of data.workoutPlans) {
        items.push({
          id: wp.id,
          label: wp.name,
          sublabel: wp.description || undefined,
          href: `/dashboard/workouts/${wp.id}`,
          category: t.nav.workouts,
          icon: Dumbbell,
        });
      }
      for (const mp of data.mealPlans) {
        items.push({
          id: mp.id,
          label: mp.name,
          sublabel: mp.description || undefined,
          href: `/dashboard/nutrition?plan=${mp.id}`,
          category: t.nav.nutrition,
          icon: UtensilsCrossed,
        });
      }
      setResults(items);
      setActiveIndex(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [t]);

  function onInputChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 250);
  }

  function navigate(item: SearchItem) {
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  // Group results by category
  const grouped: { category: string; icon: typeof Users; items: SearchItem[] }[] = [];
  for (const item of results) {
    const group = grouped.find((g) => g.category === item.category);
    if (group) {
      group.items.push(item);
    } else {
      grouped.push({ category: item.category, icon: item.icon, items: [item] });
    }
  }

  // Flat index for keyboard nav
  let flatIndex = 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`${t.common.search}... (Ctrl+K)`}
            className="flex-1 py-3.5 text-sm bg-transparent outline-none placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Results */}
        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {loading && results.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {t.common.loading}
              </div>
            ) : results.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                {t.common.noResults}
              </div>
            ) : (
              <div className="py-2">
                {grouped.map((group) => (
                  <div key={group.category}>
                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {group.category}
                    </div>
                    {group.items.map((item) => {
                      const idx = flatIndex++;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                            idx === activeIndex
                              ? "bg-brand-50 text-brand-700"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <group.icon className="h-4 w-4 shrink-0 text-gray-400" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{item.label}</div>
                            {item.sublabel && (
                              <div className="truncate text-xs text-gray-400">{item.sublabel}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          <span>Enter to select</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
