import { prisma } from "@/lib/prisma";
import { aiJSON } from "@/lib/ai";

// ─── Types ──────────────────────────────────────────────────

export interface ExerciseFilterSpec {
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string[];
  bodyRegions?: string[];
  categories?: string[];
  mechanics?: string[];
  excludeTags?: string[];
}

export interface ExerciseTaxonomy {
  difficulties: string[];
  bodyRegions: string[];
  categories: string[];
  muscleGroups: string[];
  equipment: string[];
  mechanics: string[];
}

export interface FilteredExercise {
  id: string;
  name: string;
  nameI18n: unknown;
  videoUrl: string | null;
  instructions: string | null;
  category: string | null;
  muscleGroup: string | null;
  equipment: string | null;
  difficulty: string | null;
  bodyRegion: string | null;
  mechanics: string | null;
  movementPattern: string | null;
  classification: string | null;
}

const EXERCISE_SELECT = {
  id: true,
  name: true,
  nameI18n: true,
  videoUrl: true,
  instructions: true,
  category: true,
  muscleGroup: true,
  equipment: true,
  difficulty: true,
  bodyRegion: true,
  mechanics: true,
  movementPattern: true,
  classification: true,
} as const;

const DIFFICULTY_ORDER = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

// ─── Taxonomy ───────────────────────────────────────────────

export async function fetchTaxonomy(tenantId: string): Promise<ExerciseTaxonomy> {
  const exercises = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: {
      difficulty: true,
      bodyRegion: true,
      category: true,
      muscleGroup: true,
      equipment: true,
      mechanics: true,
    },
  });

  const distinct = (values: (string | null)[]) =>
    Array.from(new Set(values.filter((v): v is string => !!v))).sort();

  return {
    difficulties: distinct(exercises.map((e) => e.difficulty)),
    bodyRegions: distinct(exercises.map((e) => e.bodyRegion)),
    categories: distinct(exercises.map((e) => e.category)),
    muscleGroups: distinct(exercises.map((e) => e.muscleGroup)),
    equipment: distinct(exercises.map((e) => e.equipment)),
    mechanics: distinct(exercises.map((e) => e.mechanics)),
  };
}

// ─── Classification (Stage 1 — cheap AI call) ───────────────

export async function classifyPrompt(
  prompt: string,
  preferences: string | undefined,
  taxonomy: ExerciseTaxonomy
): Promise<ExerciseFilterSpec> {
  const taxonomyText = Object.entries(taxonomy)
    .map(([key, values]) => `${key}: [${values.join(", ")}]`)
    .join("\n");

  const { data } = await aiJSON<ExerciseFilterSpec>({
    messages: [
      {
        role: "system",
        content: `You are a workout classification engine. Given a coach's exercise taxonomy and a workout request, return a JSON filter spec that selects the relevant subset of exercises.

AVAILABLE TAXONOMY:
${taxonomyText}

Rules:
- Only include filter dimensions that are relevant to the request. Omit dimensions that should not be filtered.
- For "excludeTags": infer contraindications from context clues. Examples:
  - "postpartum" → exclude high impact, prone exercises, heavy loading
  - "knee injury" → exclude deep squats, jumping, high impact
  - "back pain" → exclude heavy spinal loading, flexion under load
  Match excludeTags against movementPattern and classification values from the taxonomy.
- Use the EXACT values from the taxonomy above — do not invent new ones.
- Be inclusive enough to return 15-40 exercises. Don't over-filter.

Return ONLY a JSON object like:
{
  "muscleGroups": ["Glutes", "Hamstrings"],
  "equipment": ["Bodyweight", "Dumbbell"],
  "difficulty": ["Beginner", "Novice"],
  "bodyRegions": ["Lower Body"],
  "categories": ["Legs", "Core"],
  "mechanics": ["Compound"],
  "excludeTags": ["prone", "high impact"]
}

Omit any field that should not be filtered (i.e., all values are acceptable).`,
      },
      {
        role: "user",
        content: `${prompt}${preferences ? `\nPreferences: ${preferences}` : ""}`,
      },
    ],
    maxTokens: 500,
    temperature: 0.1,
  });
  return data;
}

// ─── DB Filtering (Stage 1.5) ───────────────────────────────

async function filterExercises(
  tenantId: string,
  spec: ExerciseFilterSpec
): Promise<FilteredExercise[]> {
  const where: Record<string, unknown> = { tenantId };

  if (spec.muscleGroups?.length) where.muscleGroup = { in: spec.muscleGroups };
  if (spec.equipment?.length) where.equipment = { in: spec.equipment };
  if (spec.difficulty?.length) where.difficulty = { in: spec.difficulty };
  if (spec.bodyRegions?.length) where.bodyRegion = { in: spec.bodyRegions };
  if (spec.categories?.length) where.category = { in: spec.categories };
  if (spec.mechanics?.length) where.mechanics = { in: spec.mechanics };

  if (spec.excludeTags?.length) {
    where.AND = spec.excludeTags.map((tag) => ({
      AND: [
        { movementPattern: { not: { contains: tag }, mode: "insensitive" as const } },
        { classification: { not: { contains: tag }, mode: "insensitive" as const } },
      ],
    }));
  }

  return prisma.exerciseLibrary.findMany({ where, select: EXERCISE_SELECT }) as Promise<FilteredExercise[]>;
}

export async function filterWithFallback(
  tenantId: string,
  spec: ExerciseFilterSpec
): Promise<FilteredExercise[]> {
  let results = await filterExercises(tenantId, spec);
  if (results.length >= 8) return results;

  // Relaxation 1: drop equipment filter
  const relaxed1 = { ...spec, equipment: undefined };
  results = await filterExercises(tenantId, relaxed1);
  if (results.length >= 8) return results;

  // Relaxation 2: widen difficulty ± one level
  if (spec.difficulty?.length) {
    const indices = spec.difficulty
      .map((d) => DIFFICULTY_ORDER.indexOf(d))
      .filter((i) => i !== -1);
    const min = Math.max(0, Math.min(...indices) - 1);
    const max = Math.min(DIFFICULTY_ORDER.length - 1, Math.max(...indices) + 1);
    const widened = DIFFICULTY_ORDER.slice(min, max + 1);
    results = await filterExercises(tenantId, { ...relaxed1, difficulty: widened });
    if (results.length >= 8) return results;
  }

  // Relaxation 3: only keep category filter
  if (spec.categories?.length) {
    results = await filterExercises(tenantId, { categories: spec.categories });
    if (results.length >= 8) return results;
  }

  // Final fallback: no filters, take 200
  return prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: EXERCISE_SELECT,
    take: 200,
  }) as Promise<FilteredExercise[]>;
}

// ─── Full pipeline: classify + filter ───────────────────────

export async function getFilteredExercises(
  tenantId: string,
  prompt: string,
  preferences?: string
): Promise<{ exercises: FilteredExercise[]; exerciseNames: Set<string> }> {
  const taxonomy = await fetchTaxonomy(tenantId);

  let exercises: FilteredExercise[] = [];
  if (Object.values(taxonomy).some((arr) => arr.length > 0)) {
    const filterSpec = await classifyPrompt(prompt, preferences, taxonomy);
    exercises = await filterWithFallback(tenantId, filterSpec);
  }

  if (exercises.length === 0) {
    exercises = await prisma.exerciseLibrary.findMany({
      where: { tenantId },
      select: EXERCISE_SELECT,
      take: 200,
    }) as FilteredExercise[];
  }

  const exerciseNames = new Set(exercises.map((e) => e.name.toLowerCase()));
  return { exercises, exerciseNames };
}

// ─── Fuzzy matching ─────────────────────────────────────────

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(name: string): Set<string> {
  const STOP_WORDS = new Set(["with", "using", "on", "the", "a", "an", "and", "of", "for"]);
  return new Set(
    normalize(name)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
  );
}

// Jaccard similarity: overlap of word tokens
function tokenSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  Array.from(setA).forEach((t) => {
    if (setB.has(t)) intersection++;
  });
  return intersection / (setA.size + setB.size - intersection);
}

export interface FuzzyMatchResult {
  exercise: FilteredExercise;
  similarity: number;
}

/**
 * Match an AI-generated exercise name to the library.
 * Returns the best match if similarity >= threshold (default 0.5).
 * Tries exact match first, then normalized exact, then fuzzy token overlap.
 */
export function fuzzyMatchExercise(
  name: string,
  exercises: FilteredExercise[],
  threshold = 0.5
): FuzzyMatchResult | null {
  const lower = name.toLowerCase();
  const norm = normalize(name);

  // Exact match
  for (const ex of exercises) {
    if (ex.name.toLowerCase() === lower) return { exercise: ex, similarity: 1.0 };
    const i18n = ex.nameI18n as Record<string, string> | null;
    if (i18n) {
      for (const alt of Object.values(i18n)) {
        if (alt.toLowerCase() === lower) return { exercise: ex, similarity: 1.0 };
      }
    }
  }

  // Normalized exact match (strips punctuation/dashes)
  for (const ex of exercises) {
    if (normalize(ex.name) === norm) return { exercise: ex, similarity: 0.95 };
  }

  // Fuzzy token match
  let best: FuzzyMatchResult | null = null;
  for (const ex of exercises) {
    const sim = tokenSimilarity(name, ex.name);
    if (sim >= threshold && (!best || sim > best.similarity)) {
      best = { exercise: ex, similarity: sim };
    }
    // Also check i18n names
    const i18n = ex.nameI18n as Record<string, string> | null;
    if (i18n) {
      for (const alt of Object.values(i18n)) {
        const altSim = tokenSimilarity(name, alt);
        if (altSim >= threshold && (!best || altSim > best.similarity)) {
          best = { exercise: { ...ex }, similarity: altSim };
        }
      }
    }
  }
  return best;
}

/**
 * Match all exercises in an AI response to the library.
 * Returns a map: original AI name → matched library exercise (or null).
 */
export function fuzzyMatchAll(
  aiNames: string[],
  exercises: FilteredExercise[],
  threshold = 0.5
): Map<string, FuzzyMatchResult | null> {
  const results = new Map<string, FuzzyMatchResult | null>();
  for (const name of aiNames) {
    results.set(name, fuzzyMatchExercise(name, exercises, threshold));
  }
  return results;
}

// ─── Build context string + lookup for AI prompt ────────────

export function buildExerciseContext(exercises: FilteredExercise[]): {
  libraryContext: string;
  libraryLookup: Map<string, string>;
} {
  const libraryLookup = new Map<string, string>();
  for (const ex of exercises) {
    if (ex.videoUrl) libraryLookup.set(ex.name.toLowerCase(), ex.videoUrl);
  }

  if (exercises.length === 0) {
    return { libraryContext: "\nNo exercise library available — use your general exercise knowledge.\n", libraryLookup };
  }

  const libraryContext = `\nYou have access to the following exercises from the coach's library. You MUST ONLY use exercises from this list — do NOT invent exercises or use exercises not listed here.\n${exercises
    .map((e) => {
      const i18n = e.nameI18n as Record<string, string> | null;
      const altName = i18n ? Object.values(i18n)[0] : null;
      return `- ${e.name}${altName ? ` / ${altName}` : ""}${e.category ? ` (${e.category})` : ""}${e.equipment ? ` [${e.equipment}]` : ""}${e.difficulty ? ` {${e.difficulty}}` : ""}`;
    })
    .join("\n")}\n`;

  return { libraryContext, libraryLookup };
}
