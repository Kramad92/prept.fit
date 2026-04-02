import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { validateBody, exerciseLibrarySchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  const category = req.nextUrl.searchParams.get("category");
  const difficulty = req.nextUrl.searchParams.get("difficulty");
  const equipment = req.nextUrl.searchParams.get("equipment");
  const bodyRegion = req.nextUrl.searchParams.get("bodyRegion");

  const exercises = await prisma.exerciseLibrary.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { nameBs: { contains: search, mode: "insensitive" as const } },
              { nameI18n: { string_contains: search } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(equipment ? { equipment } : {}),
      ...(bodyRegion ? { bodyRegion } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, exerciseLibrarySchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const exercise = await prisma.exerciseLibrary.create({
    data: {
      name: body.name,
      nameI18n: body.nameI18n || Prisma.JsonNull,
      category: body.category || null,
      muscleGroup: body.muscleGroup || null,
      equipment: body.equipment || null,
      videoUrl: body.videoUrl || null,
      instructions: body.instructions || null,
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}
