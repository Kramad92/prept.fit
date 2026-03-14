import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const tenantId = searchParams.get("tenantId") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tenantId) {
      where.tenantId = tenantId;
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
      take: 200,
    });

    return NextResponse.json(clients);
  } catch (err: unknown) {
    console.error("[admin/clients] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
