"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Dumbbell,
  Trash2,
  Pencil,
  X,
  Check,
  Download,
  Filter,
  Settings,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
}

interface OptionItem {
  id: string;
  name: string;
}

export default function ExerciseLibraryPage() {
  const t = useT();
  const { locale } = useLocale();

  function displayName(ex: ExerciseItem) {
    return locale !== "en" && ex.nameBs ? ex.nameBs : ex.name;
  }

  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [showManage, setShowManage] = useState(false);

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
    // Also sync categories & equipment from seeded exercises
    syncOptionsFromExercises();
    setSeeding(false);
  }

  async function syncOptionsFromExercises() {
    const [exRes, catRes, eqRes] = await Promise.all([
      fetch("/api/exercise-library").then((r) => r.json()),
      fetch("/api/exercise-categories").then((r) => r.json()),
      fetch("/api/equipment-types").then((r) => r.json()),
    ]);
    const existingCats = new Set((catRes as OptionItem[]).map((c) => c.name));
    const existingEq = new Set((eqRes as OptionItem[]).map((e) => e.name));

    const newCats = new Set<string>();
    const newEq = new Set<string>();
    for (const ex of exRes as ExerciseItem[]) {
      if (ex.category && !existingCats.has(ex.category)) newCats.add(ex.category);
      if (ex.equipment && !existingEq.has(ex.equipment)) newEq.add(ex.equipment);
    }

    await Promise.all([
      ...Array.from(newCats).map((name) =>
        fetch("/api/exercise-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
      ...Array.from(newEq).map((name) =>
        fetch("/api/equipment-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
      ),
    ]);

    loadCategories();
    loadEquipmentTypes();
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

  const filtered = exercises.filter((ex) => {
    const s = search.toLowerCase();
    const matchSearch = ex.name.toLowerCase().includes(s) || (ex.nameBs?.toLowerCase().includes(s) ?? false);
    const matchCategory = !filterCategory || ex.category === filterCategory;
    return matchSearch && matchCategory;
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.exerciseLibrary.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {exercises.length} {t.exerciseLibrary.exerciseCount}
          </p>
        </div>
        <div className="flex gap-2">
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

      <div className="mt-6 flex gap-3">
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
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input appearance-none pl-10 pr-8"
          >
            <option value="">{t.exerciseLibrary.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
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
        <div className="mt-6 space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, exs]) => (
              <div key={category}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{category}</span>
                  <span className="text-gray-400">({exs.length})</span>
                </h3>
                <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {exs.map((ex) => (
                    <div key={ex.id} className="card flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{displayName(ex)}</p>
                        {locale !== "en" && ex.nameBs && (
                          <p className="truncate text-xs text-gray-400">{ex.name}</p>
                        )}
                        <div className="flex gap-2 text-xs text-gray-500">
                          {ex.muscleGroup && <span>{ex.muscleGroup}</span>}
                          {ex.equipment && <span>- {ex.equipment}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(ex)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(ex.id)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add/Edit Exercise Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
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
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="input mt-1">
                    <option value="">{t.exerciseLibrary.select}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.equipment}</label>
                  <select value={formEquipment} onChange={(e) => setFormEquipment(e.target.value)} className="input mt-1">
                    <option value="">{t.exerciseLibrary.select}</option>
                    {equipmentTypes.map((e) => (
                      <option key={e.id} value={e.name}>{e.name}</option>
                    ))}
                  </select>
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
          onClose={() => setShowManage(false)}
          onCategoriesChange={() => { loadCategories(); loadExercises(); }}
          onEquipmentChange={() => { loadEquipmentTypes(); loadExercises(); }}
        />
      )}
    </div>
  );
}

// --- Manage Options Modal ---

function ManageOptionsModal({
  categories,
  equipmentTypes,
  exercises,
  onClose,
  onCategoriesChange,
  onEquipmentChange,
}: {
  categories: OptionItem[];
  equipmentTypes: OptionItem[];
  exercises: ExerciseItem[];
  onClose: () => void;
  onCategoriesChange: () => void;
  onEquipmentChange: () => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<"categories" | "equipment">("categories");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 md:rounded-2xl">
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
}: {
  items: OptionItem[];
  exercises: ExerciseItem[];
  field: "category" | "equipment";
  addLabel: string;
  placeholder: string;
  apiPath: string;
  onChange: () => void;
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
                <span className="flex-1 text-sm font-medium text-gray-900">{item.name}</span>
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
