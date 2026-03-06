import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = req.nextUrl.searchParams.get("search");
  const category = req.nextUrl.searchParams.get("category");

  const exercises = await prisma.exerciseLibrary.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(exercises, {
    headers: { "Cache-Control": "private, max-age=10, stale-while-revalidate=60" },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const exercise = await prisma.exerciseLibrary.create({
    data: {
      name: body.name,
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
