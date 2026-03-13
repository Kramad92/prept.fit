import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // "active" | "inactive" | null (all)
    const tier = searchParams.get("tier") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status === "active") where.isActive = true;
    if (status === "inactive") where.isActive = false;
    if (tier) where.planTier = tier;

    const tenants = await prisma.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        isActive: true,
        planTier: true,
        createdAt: true,
        _count: { select: { clients: true, users: true } },
      },
    });

    return NextResponse.json(tenants);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
