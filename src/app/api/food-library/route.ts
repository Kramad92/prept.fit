import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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

  const body = await req.json();

  const food = await prisma.foodLibrary.create({
    data: {
      name: body.name,
      defaultPortion: body.defaultPortion || null,
      calories: body.calories ? parseInt(body.calories) : null,
      protein: body.protein ? parseInt(body.protein) : null,
      carbs: body.carbs ? parseInt(body.carbs) : null,
      fat: body.fat ? parseInt(body.fat) : null,
      category: body.category || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(food, { status: 201 });
}
