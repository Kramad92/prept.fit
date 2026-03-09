import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }

  // Cap at 500 per request to prevent abuse
  const toDelete = ids.slice(0, 500);

  const result = await prisma.exerciseLibrary.deleteMany({
    where: {
      id: { in: toDelete },
      tenantId: session.user.tenantId,
    },
  });

  return NextResponse.json({ deleted: result.count });
}
