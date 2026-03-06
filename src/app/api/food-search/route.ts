import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

const USDA_API_KEY = process.env.USDA_API_KEY || "";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

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
          dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"],
          pageSize: 15,
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

    // 2. Batch-fetch details for portion data
    const fdcIds = searchFoods.map((f) => f.fdcId);
    let portionMap = new Map<number, { portion: USDAFoodPortion; label: string } | null>();

    try {
      const detailRes = await fetch(
        `${USDA_BASE}/foods?api_key=${USDA_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fdcIds,
            format: "full",
          }),
        }
      );

      if (detailRes.ok) {
        const details = (await detailRes.json()) as USDADetailFood[];
        for (const d of details) {
          portionMap.set(d.fdcId, pickBestPortion(d.foodPortions || []));
        }
      }
    } catch {
      // If batch fetch fails, fall back to 100g portions
    }

    // 3. Build results with best portions
    const foods = searchFoods.map((f) => {
      const cal = extractNutrient(f.foodNutrients, 1008);
      const protein = extractNutrient(f.foodNutrients, 1003);
      const carbs = extractNutrient(f.foodNutrients, 1005);
      const fat = extractNutrient(f.foodNutrients, 1004);

      const best = portionMap.get(f.fdcId);

      if (best) {
        const gw = best.portion.gramWeight;
        return {
          fdcId: f.fdcId,
          name: f.description,
          portion: `${best.label} (${Math.round(gw)}g)`,
          calories: scaleNutrient(cal, gw),
          protein: scaleNutrient(protein, gw),
          carbs: scaleNutrient(carbs, gw),
          fat: scaleNutrient(fat, gw),
          source: "usda",
        };
      }

      return {
        fdcId: f.fdcId,
        name: f.description,
        portion: "100g",
        calories: cal,
        protein,
        carbs,
        fat,
        source: "usda",
      };
    });

    return NextResponse.json(foods);
  } catch {
    return NextResponse.json({ error: "Failed to search USDA" }, { status: 502 });
  }
}
