#!/usr/bin/env node

/**
 * Import exercises from the Functional Fitness Exercise Database CSV
 *
 * Usage:
 *   node scripts/import-exercise-csv.mjs <path-to-csv> --tenant-id=<id>
 *   node scripts/import-exercise-csv.mjs <path-to-csv> --preview     # Show columns & sample data
 *   node scripts/import-exercise-csv.mjs <path-to-csv> --stats       # Show unique values per field
 *
 * The CSV is expected from: https://strengthtoovercome.com/functional-fitness-exercise-database
 * Header row starts at line 16 (first 15 lines are metadata).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const prisma = new PrismaClient();

// ─── CSV Parsing ──────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  // Find the header row (contains "Exercise" and "Difficulty Level")
  let headerIndex = -1;
  for (let i = 0; i < Math.min(30, lines.length); i++) {
    if (lines[i].includes("Exercise") && lines[i].includes("Difficulty Level")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error("Could not find header row in CSV. Expected columns: Exercise, Difficulty Level, etc.");
  }

  const headers = parseCSVLine(lines[headerIndex]);
  const rows = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    // Skip empty rows (exercise name is in column index 1)
    const exerciseName = fields[headers.indexOf("Exercise")]?.trim();
    if (!exerciseName) continue;

    const row = {};
    headers.forEach((h, idx) => {
      if (h) row[h] = fields[idx]?.trim() || null;
    });
    rows.push(row);
  }

  return { headers: headers.filter(Boolean), rows };
}

// ─── Column Mapping ───────────────────────────────────────────

function mapRow(row) {
  const secondaryMuscles = [row["Secondary Muscle"], row["Tertiary Muscle"]]
    .filter(Boolean)
    .join(", ") || null;

  const movementPatterns = [
    row["Movement Pattern #1"],
    row["Movement Pattern #2"],
    row["Movement Pattern #3"],
  ].filter(Boolean);

  // Clean up "Unsorted*" values
  const clean = (val) => {
    if (!val || val === "Unsorted*" || val === "None") return null;
    return val;
  };

  // Video URLs — if extracted from Google Sheets via Apps Script
  // Checks both the extracted columns and falls back to checking if the
  // "Short YouTube Demonstration" column contains an actual URL
  const demoUrl = row["Demo URL"]
    || (row["Short YouTube Demonstration"]?.startsWith("http") ? row["Short YouTube Demonstration"] : null);
  const explainUrl = row["Explanation URL"]
    || (row["In-Depth YouTube Explanation"]?.startsWith("http") ? row["In-Depth YouTube Explanation"] : null);
  // Prefer demo URL, fall back to explanation URL
  const videoUrl = demoUrl || explainUrl || null;

  return {
    name: row["Exercise"],
    category: row["Target Muscle Group"] || null,
    muscleGroup: row["Prime Mover Muscle"] || null,
    equipment: row["Primary Equipment"] || null,
    videoUrl,
    difficulty: row["Difficulty Level"] || null,
    bodyRegion: row["Body Region"] || null,
    secondaryMuscles,
    secondaryEquipment: clean(row["Secondary Equipment"]),
    movementPattern: movementPatterns[0] || null, // Primary pattern
    forceType: clean(row["Force Type"]),
    mechanics: row["Mechanics"] || null,
    laterality: row["Laterality"] || null,
    classification: clean(row["Primary Exercise Classification"]),
    // instructions composed from movement patterns for richer data
    instructions: movementPatterns.length > 1
      ? `Movement patterns: ${movementPatterns.join(", ")}`
      : null,
  };
}

// ─── Commands ─────────────────────────────────────────────────

function showPreview(headers, rows) {
  console.log("\n📋 CSV COLUMNS:");
  console.log("─".repeat(60));
  headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

  console.log(`\n📊 Total exercises: ${rows.length}`);

  console.log("\n🔍 SAMPLE (first 3 exercises):");
  console.log("─".repeat(60));
  rows.slice(0, 3).forEach((row) => {
    console.log(`\n  ${row["Exercise"]}`);
    Object.entries(row).forEach(([key, val]) => {
      if (key !== "Exercise" && val) {
        console.log(`    ${key}: ${val}`);
      }
    });
  });

  console.log("\n📐 MAPPED (first 3):");
  console.log("─".repeat(60));
  rows.slice(0, 3).forEach((row) => {
    const mapped = mapRow(row);
    console.log(`\n  ${mapped.name}`);
    Object.entries(mapped).forEach(([key, val]) => {
      if (key !== "name" && val) {
        console.log(`    ${key}: ${val}`);
      }
    });
  });
}

function showStats(rows) {
  const fields = [
    "Difficulty Level",
    "Target Muscle Group",
    "Prime Mover Muscle",
    "Primary Equipment",
    "Secondary Equipment",
    "Body Region",
    "Movement Pattern #1",
    "Force Type",
    "Mechanics",
    "Laterality",
    "Primary Exercise Classification",
    "Posture",
    "Grip",
  ];

  console.log(`\n📊 STATS (${rows.length} exercises)`);
  console.log("═".repeat(60));

  for (const field of fields) {
    const values = new Map();
    rows.forEach((row) => {
      const val = row[field] || "(empty)";
      values.set(val, (values.get(val) || 0) + 1);
    });

    const sorted = [...values.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\n${field} (${sorted.length} unique):`);
    sorted.forEach(([val, count]) => {
      console.log(`  ${count.toString().padStart(4)} × ${val}`);
    });
  }
}

async function importExercises(rows, tenantId) {
  // Check tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(`\n❌ Tenant not found: ${tenantId}`);
    console.log("\nAvailable tenants:");
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
    tenants.forEach((t) => console.log(`  ${t.id} — ${t.name} (${t.slug})`));
    process.exit(1);
  }

  console.log(`\n🏋️ Importing ${rows.length} exercises for tenant: ${tenant.name}`);

  // Get existing exercises to avoid duplicates
  const existing = await prisma.exerciseLibrary.findMany({
    where: { tenantId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
  console.log(`  Existing exercises: ${existingNames.size}`);

  // Map and filter
  const mapped = rows.map(mapRow);
  const toCreate = mapped.filter((e) => !existingNames.has(e.name.toLowerCase()));
  const skipped = mapped.length - toCreate.length;

  if (skipped > 0) {
    console.log(`  Skipping ${skipped} duplicates`);
  }

  if (toCreate.length === 0) {
    console.log("\n✅ All exercises already exist. Nothing to import.");
    return;
  }

  console.log(`  Importing ${toCreate.length} new exercises...`);

  // Batch insert (Prisma createMany has a limit, do in chunks of 500)
  const BATCH_SIZE = 500;
  let created = 0;

  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    await prisma.exerciseLibrary.createMany({
      data: batch.map((ex) => ({ ...ex, tenantId })),
    });
    created += batch.length;
    console.log(`  ... ${created}/${toCreate.length}`);
  }

  // Auto-create categories from Target Muscle Group values
  const categories = [...new Set(mapped.map((e) => e.category).filter(Boolean))];
  const existingCats = await prisma.exerciseCategory.findMany({
    where: { tenantId },
    select: { name: true },
  });
  const existingCatNames = new Set(existingCats.map((c) => c.name));
  const newCats = categories.filter((c) => !existingCatNames.has(c));

  if (newCats.length > 0) {
    await prisma.exerciseCategory.createMany({
      data: newCats.map((name) => ({ name, tenantId })),
      skipDuplicates: true,
    });
    console.log(`  Created ${newCats.length} new categories: ${newCats.join(", ")}`);
  }

  // Auto-create equipment types
  const allEquipment = [
    ...new Set([
      ...mapped.map((e) => e.equipment),
      ...mapped.map((e) => e.secondaryEquipment),
    ].filter(Boolean)),
  ];
  const existingEq = await prisma.equipmentType.findMany({
    where: { tenantId },
    select: { name: true },
  });
  const existingEqNames = new Set(existingEq.map((e) => e.name));
  const newEq = allEquipment.filter((e) => !existingEqNames.has(e));

  if (newEq.length > 0) {
    await prisma.equipmentType.createMany({
      data: newEq.map((name) => ({ name, tenantId })),
      skipDuplicates: true,
    });
    console.log(`  Created ${newEq.length} new equipment types: ${newEq.join(", ")}`);
  }

  console.log(`\n✅ Done! Imported ${created} exercises.`);
}

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    console.log(`
Usage:
  node scripts/import-exercise-csv.mjs <csv-path> --preview          Show columns & sample data
  node scripts/import-exercise-csv.mjs <csv-path> --stats            Show unique values per field
  node scripts/import-exercise-csv.mjs <csv-path> --tenant-id=<id>   Import exercises for tenant
  node scripts/import-exercise-csv.mjs <csv-path> --all-tenants      Import for ALL tenants
`);
    process.exit(0);
  }

  const csvPath = resolve(args.find((a) => !a.startsWith("--")));
  const isPreview = args.includes("--preview");
  const isStats = args.includes("--stats");
  const allTenants = args.includes("--all-tenants");
  const tenantArg = args.find((a) => a.startsWith("--tenant-id="));
  const tenantId = tenantArg?.split("=")[1];

  console.log(`\n📂 Reading: ${csvPath}`);
  const { headers, rows } = parseCSV(csvPath);
  console.log(`   Found ${rows.length} exercises with ${headers.length} columns`);

  if (isPreview) {
    showPreview(headers, rows);
  } else if (isStats) {
    showStats(rows);
  } else if (allTenants) {
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
    console.log(`\nImporting for ${tenants.length} tenants...`);
    for (const t of tenants) {
      await importExercises(rows, t.id);
    }
  } else if (tenantId) {
    await importExercises(rows, tenantId);
  } else {
    // No tenant specified — list available tenants
    console.log("\n⚠️  No tenant specified. Use --tenant-id=<id> or --all-tenants\n");
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
    console.log("Available tenants:");
    tenants.forEach((t) => console.log(`  --tenant-id=${t.id}  →  ${t.name} (${t.slug})`));
    showPreview(headers, rows);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
