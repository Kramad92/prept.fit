import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction, getAIExerciseNameInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  prompt: z.string().min(3).max(1000),
  preferences: z.string().max(500).optional(),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
  includeVideos: z.boolean().optional().default(false),
});

// ─── Types ──────────────────────────────────────────────────

interface ExerciseFilterSpec {
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string[];
  bodyRegions?: string[];
  categories?: string[];
  mechanics?: string[];
  excludeTags?: string[];
}

interface ExerciseTaxonomy {
  difficulties: string[];
  bodyRegions: string[];
  categories: string[];
  muscleGroups: string[];
  equipment: string[];
  mechanics: string[];
}

interface LibraryExercise {
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

interface GeneratedExercise {
  name: string;
  nameEn: string;
  sets: number;
  reps: string;
  weight: string;
  restSeconds: number;
  notes: string;
}

interface GeneratedWorkoutPlan {
  name: string;
  description: string;
  exercises: GeneratedExercise[];
  error?: string;
}

// ─── Stage 1: Fetch taxonomy and classify ───────────────────

async function fetchTaxonomy(tenantId: string): Promise<ExerciseTaxonomy> {
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

async function classifyPrompt(
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

// ─── Stage 1.5: Filter exercises from DB ────────────────────

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

async function filterExercises(
  tenantId: string,
  spec: ExerciseFilterSpec
): Promise<LibraryExercise[]> {
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

  return prisma.exerciseLibrary.findMany({ where, select: EXERCISE_SELECT }) as Promise<LibraryExercise[]>;
}

const DIFFICULTY_ORDER = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert"];

async function filterWithFallback(
  tenantId: string,
  spec: ExerciseFilterSpec
): Promise<LibraryExercise[]> {
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
  }) as Promise<LibraryExercise[]>;
}

// ─── Stage 2: Generate workout plan ─────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit("ai", session.user.tenantId);
  if (rl) return rl;

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { prompt, preferences, locale, includeVideos } = parsed.data;
  const tenantId = session.user.tenantId;

  try {
    // Stage 1: Classify the prompt into a filter spec
    const taxonomy = await fetchTaxonomy(tenantId);

    let filteredExercises: LibraryExercise[] = [];
    if (Object.values(taxonomy).some((arr) => arr.length > 0)) {
      const filterSpec = await classifyPrompt(prompt, preferences, taxonomy);
      filteredExercises = await filterWithFallback(tenantId, filterSpec);
    }

    // Build exercise context for Stage 2
    const exerciseNames = new Set(filteredExercises.map((e) => e.name.toLowerCase()));
    const libraryContext =
      filteredExercises.length > 0
        ? `\nYou have access to the following exercises from the coach's library. You MUST ONLY use exercises from this list — do NOT invent exercises or use exercises not listed here.\n${filteredExercises
            .map((e) => {
              const i18n = e.nameI18n as Record<string, string> | null;
              const altName = i18n ? Object.values(i18n)[0] : null;
              return `- ${e.name}${altName ? ` / ${altName}` : ""}${e.category ? ` (${e.category})` : ""}${e.equipment ? ` [${e.equipment}]` : ""}${e.difficulty ? ` {${e.difficulty}}` : ""}`;
            })
            .join("\n")}\n`
        : "\nNo exercise library available — use your general exercise knowledge.\n";

    const prefInstruction = preferences
      ? `Additional preferences/constraints: ${preferences}`
      : "";

    const langInstruction = getAILanguageInstruction(locale || "en");
    const exerciseNameInstruction = getAIExerciseNameInstruction(locale || "en");

    // Stage 2: Generate the workout plan with filtered exercises
    const { data: result, usage } = await aiJSON<GeneratedWorkoutPlan>({
      messages: [
        {
          role: "system",
          content: `You are an expert fitness coach and exercise programmer. Generate a complete workout plan based on the user's request.

SCOPE: You ONLY handle requests related to fitness, exercise, workout programming, and physical training. If the user's request is clearly unrelated (e.g. coding, math homework, general knowledge, writing essays), return ONLY this JSON: {"error": "off_topic"}. Do NOT attempt to answer off-topic requests.
${libraryContext}
Rules:
- Each exercise must have: name, nameEn (English name for reference), sets (number), reps (string like "8-12" or "10"), weight (string like "bodyweight", "moderate", or leave empty ""), restSeconds (number), notes (string with detailed form cues)
- CRITICAL: The "name" and "nameEn" fields must ONLY contain the standard exercise name (e.g. "Barbell Close Grip Bench Press"). NEVER include substitution context, reasoning, or phrases like "X is replaced with Y", "instead of X", "replaces X", or similar. If you are replacing an exercise from a previous version, just use the new exercise's clean name.
- Avoid including duplicate or overly similar exercises (e.g. do not include both Barbell Bench Press and Barbell Close Grip Bench Press in the same plan unless specifically requested). Each exercise should target the muscle group from a distinct angle or movement pattern.
- Include 5-10 exercises per workout
- Order exercises logically (compound first, isolation after)
- Use appropriate set/rep schemes for the goal (strength: 3-5x3-5, hypertrophy: 3-4x8-12, endurance: 2-3x15-20)
- Include rest periods appropriate for the training style
- The "notes" field MUST contain helpful form cues and technique tips for each exercise (2-3 sentences). Example: "Držite leđa ravno, spuštajte šipku do grudi kontrolisano. Laktove držite pod uglom od 45 stepeni. Izdahnite pri guranju."
- ${exerciseNameInstruction}
- ${langInstruction}
${prefInstruction}

Return a JSON object with this exact structure:
{
  "name": "Workout name",
  "description": "Brief description of the workout",
  "exercises": [
    {
      "name": "Potisak s klupe (Bench Press)",
      "nameEn": "Bench Press",
      "sets": 4,
      "reps": "8-12",
      "weight": "",
      "restSeconds": 90,
      "notes": "Detailed form cues here (2-3 sentences)"
    }
  ]
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 3000,
      temperature: 0.3,
    });

    if (result.error === "off_topic") {
      return NextResponse.json({ error: "Please provide a fitness or exercise related request." }, { status: 400 });
    }

    // Build a lookup from filtered exercises for videoUrl matching
    const libraryLookup = new Map<string, string>();
    for (const ex of filteredExercises) {
      if (ex.videoUrl) {
        libraryLookup.set(ex.name.toLowerCase(), ex.videoUrl);
      }
    }

    // Enrich exercises with video URLs and isFromLibrary flag
    const exercises = result.exercises.map((ex) => {
      const libraryVideo = libraryLookup.get(ex.name.toLowerCase());
      const isFromLibrary =
        exerciseNames.has(ex.name.toLowerCase()) ||
        exerciseNames.has(ex.nameEn?.toLowerCase() || "");
      let videoUrl = libraryVideo || "";

      if (!videoUrl && includeVideos && ex.nameEn) {
        const query = encodeURIComponent(`${ex.nameEn} exercise form how to`);
        videoUrl = `https://www.youtube.com/results?search_query=${query}`;
      }

      return { ...ex, videoUrl, isFromLibrary };
    });

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "generate-workout-plan", tokensIn: usage.tokensIn, tokensOut: usage.tokensOut, provider: usage.provider });
    }

    return NextResponse.json({ ...result, exercises });
  } catch (e) {
    console.error("AI generate-workout-plan error:", e);
    return NextResponse.json({ error: "Failed to generate workout plan" }, { status: 502 });
  }
}
