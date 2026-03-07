import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const USDA_API_KEY = process.env.USDA_API_KEY || "";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// In-memory cache for portion data (fdcId → best portion). Survives across requests in the same process.
const portionCache = new Map<number, { label: string; gramWeight: number } | null>();

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDASearchFood {
  fdcId: number;
  description: string;
  foodNutrients: USDANutrient[];
  dataType: string;
}

interface USDAFoodPortion {
  portionDescription: string | null;
  modifier: string | null;
  gramWeight: number;
  amount: number | null;
  measureUnit: { name: string } | null;
}

interface USDADetailFood {
  fdcId: number;
  description: string;
  foodPortions?: USDAFoodPortion[];
}

const PORTION_PRIORITY = [
  "egg", "breast", "thigh", "drumstick", "wing",
  "fillet", "patty", "link", "banana", "apple",
  "large", "medium", "small",
  "piece", "whole", "serving",
  "cup", "slice",
  "tablespoon", "teaspoon",
  "oz", "ounce",
];

function getPortionLabel(p: USDAFoodPortion): string | null {
  if (p.portionDescription && p.portionDescription !== "Quantity not specified") {
    return p.portionDescription;
  }
  // SR Legacy uses modifier + amount instead of portionDescription
  if (p.modifier && p.amount) {
    return `${p.amount} ${p.modifier}`;
  }
  if (p.modifier) {
    return p.modifier;
  }
  return null;
}

function pickBestPortion(portions: USDAFoodPortion[]): { portion: USDAFoodPortion; label: string } | null {
  const valid: { portion: USDAFoodPortion; label: string }[] = [];
  for (const p of portions) {
    if (p.gramWeight <= 0) continue;
    const label = getPortionLabel(p);
    if (!label) continue;
    valid.push({ portion: p, label });
  }
  if (!valid.length) return null;

  for (const keyword of PORTION_PRIORITY) {
    const match = valid.find(
      (v) => v.label.toLowerCase().includes(keyword)
    );
    if (match) return match;
  }

  return valid[0];
}

/**
 * Clean up verbose USDA descriptions:
 * "Chicken, broilers or fryers, breast, meat only, raw" → "Chicken breast, raw"
 * "Rice, white, long-grain, regular, raw, enriched" → "Rice, white, long-grain, raw"
 */
function cleanFoodName(description: string): string {
  const noise = [
    /,?\s*broilers or fryers/i,
    /,?\s*meat only/i,
    /,?\s*enriched/i,
    /,?\s*unenriched/i,
    /,?\s*regular/i,
    /,?\s*not fortified/i,
    /,?\s*fortified/i,
    /,?\s*without added fat/i,
    /,?\s*without skin/i,
    /,?\s*mature seeds/i,
    /,?\s*commercially prepared/i,
    /,?\s*NFS/i,
    /,?\s*NS as to form/i,
    /,?\s*NS as to.*$/i,
  ];

  let name = description;
  for (const pattern of noise) {
    name = name.replace(pattern, "");
  }

  // Collapse multiple commas/spaces
  name = name.replace(/,\s*,/g, ",").replace(/,\s*$/, "").replace(/\s{2,}/g, " ").trim();

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function extractNutrient(nutrients: USDANutrient[], id: number): number | null {
  const n = nutrients.find((n) => n.nutrientId === id);
  return n ? Math.round(n.value) : null;
}

function scaleNutrient(per100g: number | null, gramWeight: number): number | null {
  if (per100g == null) return null;
  return Math.round((per100g * gramWeight) / 100);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q");
  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  if (!USDA_API_KEY) {
    return NextResponse.json({ error: "USDA API key not configured" }, { status: 500 });
  }

  try {
    // 1. Search for foods
    const searchRes = await fetch(
      `${USDA_BASE}/foods/search?api_key=${USDA_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          dataType: ["Foundation", "SR Legacy"],
          pageSize: 8,
        }),
      }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: "USDA API error" }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const searchFoods = (searchData.foods || []).filter(
      (f: USDASearchFood) => f.dataType !== "Branded"
    ) as USDASearchFood[];

    if (searchFoods.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Batch-fetch details for portion data (with in-memory cache)
    const fdcIds = searchFoods.map((f) => f.fdcId);
    const uncachedIds = fdcIds.filter((id) => !portionCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        const detailRes = await fetch(
          `${USDA_BASE}/foods?api_key=${USDA_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fdcIds: uncachedIds,
              format: "full",
              nutrients: [],
            }),
          }
        );

        if (detailRes.ok) {
          const details = (await detailRes.json()) as USDADetailFood[];
          for (const d of details) {
            const best = pickBestPortion(d.foodPortions || []);
            portionCache.set(d.fdcId, best ? { label: best.label, gramWeight: best.portion.gramWeight } : null);
          }
        }
      } catch {
        // If batch fetch fails, fall back to 100g portions
      }
    }

    // 3. Build results with best portions
    const foods = searchFoods.map((f) => {
      const cal = extractNutrient(f.foodNutrients, 1008);
      const protein = extractNutrient(f.foodNutrients, 1003);
      const carbs = extractNutrient(f.foodNutrients, 1005);
      const fat = extractNutrient(f.foodNutrients, 1004);

      const cached = portionCache.get(f.fdcId);

      if (cached) {
        const gw = cached.gramWeight;
        // Parse leading quantity from label, e.g. "1 egg" → qty=1, unit="egg"
        const qtyMatch = cached.label.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
        const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
        const unitLabel = qtyMatch ? qtyMatch[2] : cached.label;
        const gramsPerUnit = qty > 0 ? Math.round(gw / qty) : gw;

        return {
          fdcId: f.fdcId,
          name: cleanFoodName(f.description),
          portion: `${cached.label} (${Math.round(gw)}g)`,
          calories: scaleNutrient(cal, gw),
          protein: scaleNutrient(protein, gw),
          carbs: scaleNutrient(carbs, gw),
          fat: scaleNutrient(fat, gw),
          source: "usda",
          unitLabel,
          gramsPerUnit,
        };
      }

      return {
        fdcId: f.fdcId,
        name: cleanFoodName(f.description),
        portion: "100g",
        calories: cal,
        protein,
        carbs,
        fat,
        source: "usda",
      };
    });

    return NextResponse.json(foods);
  } catch (error) {
    console.error("[GET /api/food-search]", error);
    return NextResponse.json({ error: "Failed to search USDA" }, { status: 502 });
  }
}
