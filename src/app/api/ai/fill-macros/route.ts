import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { aiJSON } from "@/lib/ai";
import { z } from "zod";
import { validateBody } from "@/lib/validations";
import { getAILanguageInstruction } from "@/lib/ai-locale";
import { logAiUsage } from "@/lib/usage";

const schema = z.object({
  foods: z.array(
    z.object({
      name: z.string().min(1),
      portion: z.string().optional().default("100g"),
    })
  ).min(1).max(30),
  locale: z.enum(["bs", "sr", "hr", "en"]).optional().default("en"),
});

interface FoodMacros {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, schema);
  if ("error" in parsed) return parsed.error;

  const { foods, locale } = parsed.data;

  const langNote = getAILanguageInstruction(locale || "en");

  const foodList = foods
    .map((f, i) => `${i + 1}. ${f.name} — ${f.portion}`)
    .join("\n");

  try {
    const raw = await aiJSON<FoodMacros[] | { foods: FoodMacros[] }>({
      messages: [
        {
          role: "system",
          content: `You are a precise nutrition database. Given a list of foods with portions, return the macronutrient data as a JSON array.

Rules:
- Return ONLY a JSON array of objects with: name, portion, calories, protein, carbs, fat
- All macro values must be integers (round to nearest whole number)
- Use standard nutritional data (per the specified portion)
- If a portion is not specified, use 100g
- Keep the food name clean and simple
- ${langNote}
- Do NOT add any explanation, just the JSON array`,
        },
        {
          role: "user",
          content: `Return macros for these foods:\n${foodList}`,
        },
      ],
      maxTokens: 2048,
    });

    // Normalize — AI sometimes wraps array in an object
    const result = Array.isArray(raw) ? raw : (raw as any).foods || [];
    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
    }

    if (session.user.tenantId) {
      logAiUsage({ tenantId: session.user.tenantId, endpoint: "fill-macros", provider: process.env.AI_PROVIDER || "groq" });
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("AI fill-macros error:", e);
    return NextResponse.json({ error: "Failed to get nutrition data" }, { status: 502 });
  }
}
