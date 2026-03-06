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
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/lib/i18n";

interface ExerciseItem {
  id: string;
  name: string;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  videoUrl: string | null;
  instructions: string | null;
}

const CATEGORIES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell", "Other"];

const CATEGORY_KEYS: Record<string, keyof typeof import("@/lib/i18n/bs").bs.exerciseLibrary> = {
  Chest: "chest", Back: "back", Legs: "legs", Shoulders: "shoulders",
  Arms: "arms", Core: "core", Cardio: "cardio",
};

const EQUIPMENT_KEYS: Record<string, keyof typeof import("@/lib/i18n/bs").bs.exerciseLibrary> = {
  Barbell: "barbell", Dumbbell: "dumbbell", Cable: "cable", Machine: "machine",
  Bodyweight: "bodyweight", Kettlebell: "kettlebell", Other: "other",
};

export default function ExerciseLibraryPage() {
  const t = useT();

  function tCategory(cat: string) {
    const key = CATEGORY_KEYS[cat];
    return key ? (t.exerciseLibrary as any)[key] : cat;
  }

  function tEquipment(eq: string) {
    const key = EQUIPMENT_KEYS[eq];
    return key ? (t.exerciseLibrary as any)[key] : eq;
  }

  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadExercises();
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
    setFormName(ex.name);
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
    const matchSearch = ex.name.toLowerCase().includes(search.toLowerCase());
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{tCategory(c)}</option>
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
                  <span className="rounded bg-brand-50 px-2 py-0.5 text-brand-700">{tCategory(category)}</span>
                  <span className="text-gray-400">({exs.length})</span>
                </h3>
                <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {exs.map((ex) => (
                    <div key={ex.id} className="card flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">{ex.name}</p>
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

      {/* Add/Edit Modal */}
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
                <label className="block text-sm font-medium text-gray-700">{t.common.name} *</label>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} className="input mt-1" placeholder={t.exerciseLibrary.namePlaceholder} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.category}</label>
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="input mt-1">
                    <option value="">{t.exerciseLibrary.select}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{tCategory(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t.exerciseLibrary.equipment}</label>
                  <select value={formEquipment} onChange={(e) => setFormEquipment(e.target.value)} className="input mt-1">
                    <option value="">{t.exerciseLibrary.select}</option>
                    {EQUIPMENT.map((e) => (
                      <option key={e} value={e}>{tEquipment(e)}</option>
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
    </div>
  );
}
