import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// Coach assigns habits to a client
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId, habitIds } = await req.json();

  const results = [];
  for (const habitId of habitIds) {
    try {
      const assignment = await prisma.clientHabit.create({
        data: { clientId, habitId },
      });
      results.push(assignment);
    } catch {
      // Unique constraint — already assigned, skip
    }
  }

  return NextResponse.json(results, { status: 201 });
}
