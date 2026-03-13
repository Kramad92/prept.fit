import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            clients: true,
            users: true,
            workouts: true,
            mealPlans: true,
            aiUsageLogs: true,
            storageUsageLogs: true,
          },
        },
        clients: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        users: {
          where: { role: "COACH" },
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
      data.deactivatedAt = body.isActive ? null : new Date();
    }

    if (typeof body.planTier === "string") {
      data.planTier = body.planTier;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json(tenant);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
