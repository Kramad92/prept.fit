import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { validateBody, foodLibrarySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");

  const foods = await prisma.foodLibrary.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(foods);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, foodLibrarySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const food = await prisma.foodLibrary.create({
    data: {
      name: body.name,
      defaultPortion: body.portion || null,
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,
      category: body.category || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(food, { status: 201 });
}
