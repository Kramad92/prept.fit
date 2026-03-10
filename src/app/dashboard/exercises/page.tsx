"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Dumbbell,
  Trash2,
  Pencil,
  X,
  Check,
  Download,
  Settings,
  Play,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterSelect } from "@/components/ui/filter-select";
import { useT, useLocale } from "@/lib/i18n";

interface ExerciseItem {
  id: string;
  name: string;
  nameBs: string | null;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  videoUrl: string | null;
  instructions: string | null;
  difficulty: string | null;
  bodyRegion: string | null;
  secondaryMuscles: string | null;
  movementPattern: string | null;
  forceType: string | null;
  mechanics: string | null;
  laterality: string | null;
  classification: string | null;
}

interface OptionItem {
  id: string;
  name: string;
}

export default function ExerciseLibraryPage() {
  const t = useT();
  const { locale } = useLocale();
  const searchParams = useSearchParams();

  function displayName(ex: ExerciseItem) {
    return locale !== "en" && ex.nameBs ? ex.nameBs : ex.name;
  }

  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string[]>([]);
  const [filterEquipment, setFilterEquipment] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [detailExercise, setDetailExercise] = useState<ExerciseItem | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set<string>());

  function toggleCollapsed(category: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  }

  function collapseAll() {
    setCollapsedCategories(new Set(Object.keys(grouped)));
  }

  function expandAll() {
    setCollapsedCategories(new Set<string>());
  }

  // Hidden categories/equipment (persisted in localStorage)
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("hiddenExerciseCategories");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>();
    } catch { return new Set(); }
  });
  const [hiddenEquipment, setHiddenEquipment] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("hiddenExerciseEquipment");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>();
    } catch { return new Set(); }
  });

  function toggleHiddenCategory(name: string) {
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      localStorage.setItem("hiddenExerciseCategories", JSON.stringify(Array.from(next)));
      return next;
    });
  }

  function toggleHiddenEquipment(name: string) {
    setHiddenEquipment((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      localStorage.setItem("hiddenExerciseEquipment", JSON.stringify(Array.from(next)));
      return next;
    });
  }

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formMuscleGroup, setFormMuscleGroup] = useState("");
  const [formEquipment, setFormEquipment] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  function loadExercises() {
    fetch("/api/exercise-library")
      .then((r) => r.json())
      .then(setExercises)
      .catch(() => {});
  }

  function loadCategories() {
    fetch("/api/exercise-categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }

  function loadEquipmentTypes() {
    fetch("/api/equipment-types")
      .then((r) => r.json())
      .then(setEquipmentTypes)
      .catch(() => {});
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/exercise-library").then((r) => r.json()),
      fetch("/api/exercise-categories").then((r) => r.json()),
      fetch("/api/equipment-types").then((r) => r.json()),
    ])
      .then(([ex, cats, eq]) => {
        setExercises(ex);
        setCategories(cats);
        setEquipmentTypes(eq);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Open detail modal when navigated from global search
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && exercises.length > 0) {
      const ex = exercises.find((e) => e.id === highlightId);
      if (ex) setDetailExercise(ex);
    }
  }, [searchParams, exercises]);

  function resetForm() {
    setFormName("");
    setFormCategory("");
    setFormMuscleGroup("");
    setFormEquipment("");
    setFormVideoUrl("");
    setFormInstructions("");
    setEditingId(null);
  }

  async function handleSeed() {
    setSeeding(true);
    await fetch("/api/exercise-library/seed", { method: "POST" });
    loadExercises();
    loadCategories();
    loadEquipmentTypes();
    setSeeding(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const body = {
      name: formName,
      category: formCategory || null,
      muscleGroup: formMuscleGroup || null,
      equipment: formEquipment || null,
      videoUrl: formVideoUrl || null,
      instructions: formInstructions || null,
    };

    if (editingId) {
      await fetch(`/api/exercise-library/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/exercise-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setSaving(false);
    setShowAdd(false);
    resetForm();
    loadExercises();
  }

  function startEdit(ex: ExerciseItem) {
    setEditingId(ex.id);
    setFormName(locale !== "en" && ex.nameBs ? ex.nameBs : ex.name);
    setFormCategory(ex.category || "");
    setFormMuscleGroup(ex.muscleGroup || "");
    setFormEquipment(ex.equipment || "");
    setFormVideoUrl(ex.videoUrl || "");
    setFormInstructions(ex.instructions || "");
    setShowAdd(true);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/exercise-library/${id}`, { method: "DELETE" });
    loadExercises();
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} exercises? This cannot be undone.`)) return;
    setBatchDeleting(true);
    const ids = Array.from(selected);
    // Delete in chunks of 500
    for (let i = 0; i < ids.length; i += 500) {
      await fetch("/api/exercise-library/batch", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ids.slice(i, i + 500) }),
      });
    }
    setSelected(new Set());
    setSelectMode(false);
    setBatchDeleting(false);
    loadExercises();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((ex) => ex.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const filtered = exercises.filter((ex) => {
    const s = search.toLowerCase();
    const matchSearch = ex.name.toLowerCase().includes(s) || (ex.nameBs?.toLowerCase().includes(s) ?? false);
    const matchCategory = !filterCategory || ex.category === filterCategory;
    const matchDifficulty = filterDifficulty.length === 0 || (ex.difficulty && filterDifficulty.includes(ex.difficulty));
    const matchEquipment = filterEquipment.length === 0 || (ex.equipment && filterEquipment.includes(ex.equipment));
    const notHiddenCat = !ex.category || !hiddenCategories.has(ex.category);
    const notHiddenEq = !ex.equipment || !hiddenEquipment.has(ex.equipment);
    return matchSearch && matchCategory && matchDifficulty && matchEquipment && notHiddenCat && notHiddenEq;
  });

  const hiddenCount = exercises.length - exercises.filter((ex) => {
    const notHiddenCat = !ex.category || !hiddenCategories.has(ex.category);
    const notHiddenEq = !ex.equipment || !hiddenEquipment.has(ex.equipment);
    return notHiddenCat && notHiddenEq;
  }).length;

  // Group by category
  const grouped: Record<string, ExerciseItem[]> = {};
  for (const ex of filtered) {
    const cat = ex.category || t.exerciseLibrary.uncategorized;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ex);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Batch delete bar */}
      {selectMode && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-4 py-3 sm:gap-3">
          <span className="text-sm font-medium text-red-700">
            {selected.size} selected
          </span>
          <button onClick={selectAllFiltered} className="text-sm text-red-600 underline hover:text-red-800">
            Select all {filtered.length}
          </button>
          {selected.size > 0 && (
            <button onClick={deselectAll} className="text-sm text-gray-500 underline hover:text-gray-700">
              Deselect
            </button>
          )}
          <div className="hidden flex-1 sm:block" />
          <button
            onClick={handleBatchDelete}
            disabled={selected.size === 0 || batchDeleting}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="mr-1 inline h-3.5 w-3.5" />
            {batchDeleting ? "Deleting..." : `Delete ${selected.size}`}
          </button>
          <button
            onClick={() => { setSelectMode(false); setSelected(new Set()); }}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.exerciseLibrary.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {exercises.length} {t.exerciseLibrary.exerciseCount}
            {hiddenCount > 0 && (
              <span className="ml-1 text-gray-400">({hiddenCount} hidden)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {exercises.length === 0 && (
            <button onClick={handleSeed} disabled={seeding} className="btn-secondary">
              <Download className="mr-2 h-4 w-4" />
              {seeding ? t.common.loading : t.exerciseLibrary.loadDefaults}
            </button>
          )}
          {exercises.length > 0 && exercises.length < 50 && (
            <button onClick={handleSeed} disabled={seeding} className="btn-secondary text-sm">
              <Download className="mr-1 h-4 w-4" />
              {seeding ? t.exerciseLibrary.adding : t.exerciseLibrary.addDefaults}
            </button>
          )}
          {exercises.length > 0 && !selectMode && (
            <button
              onClick={() => setSelectMode(true)}
              className="btn-secondary"
              title="Batch select"
            >
              <CheckSquare className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setShowManage(true)}
            className="btn-secondary"
            title={t.exerciseLibrary.manageOptions}
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t.exerciseLibrary.addExercise}</span>
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t.exerciseLibrary.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <FilterSelect
            value={filterCategory}
            onChange={setFilterCategory}
            placeholder={t.exerciseLibrary.allCategories}
            className="w-full sm:w-auto"
            options={categories.map((c) => ({ value: c.name, label: c.name }))}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterSelect
            multi
            value={filterDifficulty}
            onChange={setFilterDifficulty}
            placeholder="All Difficulty"
            options={["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master", "Grand Master", "Legendary"].map((d) => ({ value: d, label: d }))}
            className="w-full sm:w-48"
          />
          <FilterSelect
            multi
            value={filterEquipment}
            onChange={setFilterEquipment}
            placeholder="All Equipment"
            options={equipmentTypes.map((e) => ({ value: e.name, label: e.name }))}
            className="w-full sm:w-48"
          />
          <div className="flex items-center gap-2">
            {(filterCategory || filterDifficulty.length > 0 || filterEquipment.length > 0) && (
              <button
                onClick={() => { setFilterCategory(""); setFilterDifficulty([]); setFilterEquipment([]); }}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Clear filters
              </button>
            )}
            <span className="flex items-center text-xs text-gray-400">
              {filtered.length} / {exercises.length}
            </span>
          </div>
        </div>
      </div>

      {exercises.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Dumbbell}
            title={t.exerciseLibrary.noExercises}
            description={t.exerciseLibrary.noExercisesDesc}
            action={
              <button onClick={handleSeed} disabled={seeding} className="btn-primary">
                <Download className="mr-2 h-4 w-4" />
                {seeding ? t.common.loading : t.exerciseLibrary.loadDefaultsCount}
              </button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">{t.exerciseLibrary.noMatch}</p>
      ) : (
        <div className="mt-6 space-y-2">
          {Object.keys(grouped).length > 1 && (
            <div className="flex justify-end gap-2 text-xs">
              <button onClick={expandAll} className="text-gray-400 hover:text-gray-600">Expand all</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAll} className="text-gray-400 hover:text-gray-600">Collapse all</button>
            </div>
          )}
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, exs]) => (
              <div key={category}>
                <button
                  onClick={() => toggleCollapsed(category)}
                  className="flex w-full items-center gap-2 rounded-lg py-1.5 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {collapsedCategories.has(category) ? (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{category}</span>
                  <span className="text-gray-400">({exs.length})</span>
                </button>
                {!collapsedCategories.has(category) && (
                <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {exs.map((ex) => (
                    <div
                      key={ex.id}
                      className={`group card cursor-pointer overflow-hidden py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selected.has(ex.id) ? "ring-2 ring-red-300 bg-red-50/30" : ""}`}
                      onClick={selectMode ? () => toggleSelect(ex.id) : () => setDetailExercise(ex)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        {selectMode && (
                          <div className="flex-shrink-0 pt-0.5">
                            {selected.has(ex.id) ? (
                              <CheckSquare className="h-4 w-4 text-red-500" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">{displayName(ex)}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                            {ex.muscleGroup && <span>{ex.muscleGroup}</span>}
                            {ex.equipment && <span>· {ex.equipment}</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {ex.difficulty && (
                              <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                ex.difficulty === "Beginner" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                ex.difficulty === "Novice" ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                ex.difficulty === "Intermediate" ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                ex.difficulty === "Advanced" ? "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                                "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {ex.difficulty}
                              </span>
                            )}
                            {ex.videoUrl && (
                              <span className="inline-block rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-500 dark:bg-red-900/30 dark:text-red-400">
                                <Play className="mr-0.5 inline h-2.5 w-2.5 fill-current" />
                                Video
                              </span>
                            )}
                          </div>
                        </div>
                        {!selectMode && (
                          <div className="flex flex-shrink-0 gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(ex); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(ex.id); }}
                              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Exercise Detail Modal */}
      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          locale={locale}
          onClose={() => setDetailExercise(null)}
          onEdit={(ex) => { setDetailExercise(null); startEdit(ex); }}
          onDelete={(id) => { setDetailExercise(null); handleDelete(id); }}
        />
      )}

      {/* Add/Edit Exercise Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingId ? t.exerciseLibrary.editExercise : t.exerciseLibrary.addExercise}
              </h2>
              <button
                onClick={() => {
                  setShowAdd(false);
                  resetForm();
                }}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.exerciseName} *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="input mt-1" placeholder={t.exerciseLibrary.namePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.category}</label>
                  <FilterSelect
                    value={formCategory}
                    onChange={setFormCategory}
                    placeholder={t.exerciseLibrary.select}
                    className="mt-1"
                    options={categories.map((c) => ({ value: c.name, label: c.name }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.equipment}</label>
                  <FilterSelect
                    value={formEquipment}
                    onChange={setFormEquipment}
                    placeholder={t.exerciseLibrary.select}
                    className="mt-1"
                    options={equipmentTypes.map((e) => ({ value: e.name, label: e.name }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.muscleGroup}</label>
                <input type="text" value={formMuscleGroup} onChange={(e) => setFormMuscleGroup(e.target.value)} className="input mt-1" placeholder={t.exerciseLibrary.selectMuscle} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.workouts.videoUrl}</label>
                <input type="url" value={formVideoUrl} onChange={(e) => setFormVideoUrl(e.target.value)} className="input mt-1" placeholder="https://youtube.com/watch?v=..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.instructions}</label>
                <textarea value={formInstructions} onChange={(e) => setFormInstructions(e.target.value)} rows={2} className="input mt-1" placeholder={t.exerciseLibrary.instructionsPlaceholder} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? t.common.saving : editingId ? t.workouts.saveChanges : t.exerciseLibrary.addExercise}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories & Equipment Modal */}
      {showManage && (
        <ManageOptionsModal
          categories={categories}
          equipmentTypes={equipmentTypes}
          exercises={exercises}
          hiddenCategories={hiddenCategories}
          hiddenEquipment={hiddenEquipment}
          onToggleCategory={toggleHiddenCategory}
          onToggleEquipment={toggleHiddenEquipment}
          onClose={() => setShowManage(false)}
          onCategoriesChange={() => { loadCategories(); loadExercises(); }}
          onEquipmentChange={() => { loadEquipmentTypes(); loadExercises(); }}
        />
      )}
    </div>
  );
}

// --- YouTube Embed Helper ---

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    // Handle youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    // Handle youtube.com/watch?v=VIDEO_ID
    const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    // Handle youtube.com/embed/VIDEO_ID (already embed)
    if (url.includes("/embed/")) return url;
    return null;
  } catch {
    return null;
  }
}

// --- Exercise Detail Modal ---

function ExerciseDetailModal({
  exercise: ex,
  locale,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: ExerciseItem;
  locale: string;
  onClose: () => void;
  onEdit: (ex: ExerciseItem) => void;
  onDelete: (id: string) => void;
}) {
  const displayName = locale !== "en" && ex.nameBs ? ex.nameBs : ex.name;
  const embedUrl = ex.videoUrl ? getYouTubeEmbedUrl(ex.videoUrl) : null;

  const difficultyColor =
    ex.difficulty === "Beginner" ? "bg-green-50 text-green-700" :
    ex.difficulty === "Novice" ? "bg-blue-50 text-blue-700" :
    ex.difficulty === "Intermediate" ? "bg-yellow-50 text-yellow-700" :
    ex.difficulty === "Advanced" ? "bg-orange-50 text-orange-700" :
    "bg-red-50 text-red-700";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-black/50 p-0 md:items-center md:p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>
            {locale !== "en" && ex.nameBs && (
              <p className="text-sm text-gray-400">{ex.name}</p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(ex)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => { if (confirm("Delete this exercise?")) onDelete(ex.id); }}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        {embedUrl && (
          <div className="mt-4 overflow-hidden rounded-xl bg-black">
            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={displayName}
              />
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {ex.difficulty && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor}`}>
              {ex.difficulty}
            </span>
          )}
          {ex.bodyRegion && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
              {ex.bodyRegion}
            </span>
          )}
          {ex.mechanics && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
              {ex.mechanics}
            </span>
          )}
          {ex.forceType && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {ex.forceType}
            </span>
          )}
          {ex.laterality && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {ex.laterality}
            </span>
          )}
          {ex.classification && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {ex.classification}
            </span>
          )}
        </div>

        {/* Details Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {ex.category && (
            <div>
              <p className="text-xs font-medium text-gray-400">Target Muscle Group</p>
              <p className="text-gray-900">{ex.category}</p>
            </div>
          )}
          {ex.muscleGroup && (
            <div>
              <p className="text-xs font-medium text-gray-400">Prime Mover</p>
              <p className="text-gray-900">{ex.muscleGroup}</p>
            </div>
          )}
          {ex.secondaryMuscles && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-gray-400">Secondary Muscles</p>
              <p className="text-gray-900">{ex.secondaryMuscles}</p>
            </div>
          )}
          {ex.equipment && (
            <div>
              <p className="text-xs font-medium text-gray-400">Equipment</p>
              <p className="text-gray-900">{ex.equipment}</p>
            </div>
          )}
          {ex.movementPattern && (
            <div>
              <p className="text-xs font-medium text-gray-400">Movement Pattern</p>
              <p className="text-gray-900">{ex.movementPattern}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        {ex.instructions && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-400">Instructions</p>
            <p className="mt-1 text-sm text-gray-700">{ex.instructions}</p>
          </div>
        )}

        {/* External link */}
        {ex.videoUrl && !embedUrl && (
          <a
            href={ex.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
          >
            <Play className="h-3.5 w-3.5" />
            Watch video
          </a>
        )}
      </div>
    </div>
  );
}

// --- Manage Options Modal ---

function ManageOptionsModal({
  categories,
  equipmentTypes,
  exercises,
  hiddenCategories,
  hiddenEquipment,
  onToggleCategory,
  onToggleEquipment,
  onClose,
  onCategoriesChange,
  onEquipmentChange,
}: {
  categories: OptionItem[];
  equipmentTypes: OptionItem[];
  exercises: ExerciseItem[];
  hiddenCategories: Set<string>;
  hiddenEquipment: Set<string>;
  onToggleCategory: (name: string) => void;
  onToggleEquipment: (name: string) => void;
  onClose: () => void;
  onCategoriesChange: () => void;
  onEquipmentChange: () => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<"categories" | "equipment">("categories");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 md:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t.exerciseLibrary.manageOptions}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setTab("categories")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "categories" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.exerciseLibrary.categories}
          </button>
          <button
            onClick={() => setTab("equipment")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "equipment" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.exerciseLibrary.equipmentTypes}
          </button>
        </div>

        <div className="mt-4">
          {tab === "categories" ? (
            <OptionList
              items={categories}
              exercises={exercises}
              field="category"
              addLabel={t.exerciseLibrary.addCategory}
              placeholder={t.exerciseLibrary.categoryName}
              apiPath="/api/exercise-categories"
              onChange={onCategoriesChange}
              hiddenSet={hiddenCategories}
              onToggleHidden={onToggleCategory}
            />
          ) : (
            <OptionList
              items={equipmentTypes}
              exercises={exercises}
              field="equipment"
              addLabel={t.exerciseLibrary.addEquipment}
              placeholder={t.exerciseLibrary.equipmentName}
              apiPath="/api/equipment-types"
              onChange={onEquipmentChange}
              hiddenSet={hiddenEquipment}
              onToggleHidden={onToggleEquipment}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// --- Reusable Option List (used for both categories and equipment) ---

function OptionList({
  items,
  exercises,
  field,
  addLabel,
  placeholder,
  apiPath,
  onChange,
  hiddenSet,
  onToggleHidden,
}: {
  items: OptionItem[];
  exercises: ExerciseItem[];
  field: "category" | "equipment";
  addLabel: string;
  placeholder: string;
  apiPath: string;
  onChange: () => void;
  hiddenSet: Set<string>;
  onToggleHidden: (name: string) => void;
}) {
  const t = useT();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  function countUsage(name: string) {
    return exercises.filter((ex) => ex[field] === name).length;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError("");

    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });

    if (res.status === 409) {
      setError(t.exerciseLibrary.alreadyExists);
    } else {
      setNewName("");
      onChange();
    }
    setAdding(false);
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return;
    setError("");

    const res = await fetch(`${apiPath}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });

    if (res.ok) {
      setEditingId(null);
      setEditName("");
      onChange();
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm(t.exerciseLibrary.deleteConfirm)) return;
    await fetch(`${apiPath}/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div>
      {/* Add new */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(""); }}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button type="submit" disabled={adding || !newName.trim()} className="btn-primary whitespace-nowrap">
          <Plus className="mr-1 h-4 w-4" />
          {addLabel}
        </button>
      </form>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* List */}
      <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">
            {field === "category" ? t.exerciseLibrary.categories : t.exerciseLibrary.equipmentTypes} — none yet
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
            {editingId === item.id ? (
              <>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input flex-1 py-1 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleRename(item.id); }
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button onClick={() => handleRename(item.id)} className="rounded p-1 text-brand-600 hover:bg-brand-50">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setEditingId(null)} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onToggleHidden(item.name)}
                  className={`rounded p-1 ${hiddenSet.has(item.name) ? "text-gray-300 hover:bg-gray-100" : "text-brand-500 hover:bg-brand-50"}`}
                  title={hiddenSet.has(item.name) ? "Show exercises" : "Hide exercises"}
                >
                  {hiddenSet.has(item.name) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <span className={`flex-1 text-sm font-medium ${hiddenSet.has(item.name) ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.name}</span>
                <span className="text-xs text-gray-400">
                  {countUsage(item.name)} {t.exerciseLibrary.usedByExercises}
                </span>
                <button
                  onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
