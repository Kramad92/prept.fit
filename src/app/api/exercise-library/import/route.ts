import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";
import { requireCoach } from "@/lib/session";

interface RawExercise {
  name: string;
  difficulty: string | null;
  targetMuscleGroup: string | null;
  primeMover: string | null;
  secondaryMuscle: string | null;
  tertiaryMuscle: string | null;
  equipment: string | null;
  secondaryEquipment: string | null;
  bodyRegion: string | null;
  forceType: string | null;
  mechanics: string | null;
  laterality: string | null;
  classification: string | null;
  movementPattern: string | null;
  demoUrl: string | null;
  explanationUrl: string | null;
}

let cachedExercises: RawExercise[] | null = null;

function loadExercises(): RawExercise[] {
  if (cachedExercises) return cachedExercises;
  const filePath = join(process.cwd(), "prisma", "exercises.json");
  cachedExercises = JSON.parse(readFileSync(filePath, "utf-8"));
  return cachedExercises!;
}

// GET — return available filters + counts (no auth needed for preview)
export async function GET() {
  const exercises = loadExercises();

  const count = (key: keyof RawExercise) => {
    const map: Record<string, number> = {};
    for (const e of exercises) {
      const val = e[key];
      if (val) map[val] = (map[val] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  return NextResponse.json({
    total: exercises.length,
    difficulties: count("difficulty"),
    equipment: count("equipment"),
    bodyRegions: count("bodyRegion"),
    classifications: count("classification"),
    targetMuscleGroups: count("targetMuscleGroup"),
  });
}

// POST — import filtered exercises into tenant's library
export async function POST(req: NextRequest) {
  const session = await requireCoach();
  const tenantId = session.user.tenantId;

  const {
    difficulties,
    equipment,
    bodyRegions,
    classifications,
  }: {
    difficulties?: string[];
    equipment?: string[];
    bodyRegions?: string[];
    classifications?: string[];
  } = await req.json();

  const allExercises = loadExercises();

  // Filter exercises based on selections
  const filtered = allExercises.filter((e) => {
    if (difficulties?.length && (!e.difficulty || !difficulties.includes(e.difficulty))) return false;
    if (equipment?.length && (!e.equipment || !equipment.includes(e.equipment))) return false;
    if (bodyRegions?.length && (!e.bodyRegion || !bodyRegions.includes(e.bodyRegion))) return false;
    if (classifications?.length && (!e.classification || !classifications.includes(e.classification))) return false;
    return true;
  });

  if (filtered.length === 0) {
    return NextResponse.json({ error: "No exercises match your filters" }, { status: 400 });
  }

  // Get existing exercise names to avoid duplicates
  const existing = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

  const toImport = filtered.filter((e) => !existingNames.has(e.name.toLowerCase()));

  if (toImport.length === 0) {
    return NextResponse.json({
      imported: 0,
      skipped: filtered.length,
      message: "All selected exercises already exist in your library",
    });
  }

  // Map target muscle group to category
  function toCategory(e: RawExercise): string | null {
    const group = e.targetMuscleGroup;
    if (!group) return null;
    const map: Record<string, string> = {
      Chest: "Chest",
      Shoulders: "Shoulders",
      Triceps: "Arms",
      Biceps: "Arms",
      Forearms: "Arms",
      Back: "Back",
      Trapezius: "Back",
      Quadriceps: "Legs",
      Hamstrings: "Legs",
      Glutes: "Legs",
      Calves: "Legs",
      Adductors: "Legs",
      Abductors: "Legs",
      Shins: "Legs",
      Abdominals: "Core",
      "Hip Flexors": "Core",
    };
    return map[group] || group;
  }

  // Build secondary muscles string
  function secondaryMuscles(e: RawExercise): string | null {
    const parts = [e.secondaryMuscle, e.tertiaryMuscle].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  }

  // Batch insert in chunks of 500
  const CHUNK = 500;
  let imported = 0;

  for (let i = 0; i < toImport.length; i += CHUNK) {
    const chunk = toImport.slice(i, i + CHUNK);
    await prisma.exerciseLibrary.createMany({
      data: chunk.map((e) => ({
        name: e.name,
        category: toCategory(e),
        muscleGroup: e.primeMover,
        equipment: e.equipment,
        secondaryEquipment: e.secondaryEquipment,
        secondaryMuscles: secondaryMuscles(e),
        difficulty: e.difficulty,
        bodyRegion: e.bodyRegion,
        forceType: e.forceType === "Unsorted*" ? null : e.forceType,
        mechanics: e.mechanics,
        laterality: e.laterality,
        classification: e.classification,
        movementPattern: e.movementPattern,
        videoUrl: e.demoUrl || null,
        tenantId,
      })),
    });
    imported += chunk.length;
  }

  // Auto-create categories and equipment types
  const categories = Array.from(new Set(toImport.map((e) => toCategory(e)).filter(Boolean))) as string[];
  const equipmentTypes = Array.from(new Set(toImport.map((e) => e.equipment).filter(Boolean))) as string[];

  for (const name of categories) {
    await prisma.exerciseCategory.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { name, tenantId },
      update: {},
    });
  }

  for (const name of equipmentTypes) {
    await prisma.equipmentType.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { name, tenantId },
      update: {},
    });
  }

  return NextResponse.json({
    imported,
    skipped: filtered.length - toImport.length,
    total: filtered.length,
  });
}
