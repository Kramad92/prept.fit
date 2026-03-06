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

interface USDAFood {
  fdcId: number;
  description: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  brandName?: string;
  dataType: string;
}

function extractNutrient(nutrients: USDANutrient[], id: number): number | null {
  const n = nutrients.find((n) => n.nutrientId === id);
  return n ? Math.round(n.value) : null;
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
    const res = await fetch(
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

    if (!res.ok) {
      return NextResponse.json({ error: "USDA API error" }, { status: 502 });
    }

    const data = await res.json();
    const foods = (data.foods || []).filter((f: USDAFood) => f.dataType !== "Branded").map((f: USDAFood) => ({
      fdcId: f.fdcId,
      name: f.description,
      portion: f.servingSize
        ? `${f.servingSize}${f.servingSizeUnit || "g"}`
        : "100g",
      calories: extractNutrient(f.foodNutrients, 1008), // Energy (kcal)
      protein: extractNutrient(f.foodNutrients, 1003),  // Protein
      carbs: extractNutrient(f.foodNutrients, 1005),    // Carbohydrate
      fat: extractNutrient(f.foodNutrients, 1004),      // Total fat
      source: "usda",
    }));

    return NextResponse.json(foods);
  } catch {
    return NextResponse.json({ error: "Failed to search USDA" }, { status: 502 });
  }
}
