import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const [
      tenantCount,
      clientCount,
      userCount,
      aiUsageCount,
      storageTotalBytes,
      recentTenants,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.client.count(),
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.aiUsageLog.count(),
      prisma.storageUsageLog.aggregate({ _sum: { sizeBytes: true } }),
      prisma.tenant.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          planTier: true,
          createdAt: true,
          _count: { select: { clients: true } },
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        tenants: tenantCount,
        clients: clientCount,
        users: userCount,
        aiCalls: aiUsageCount,
        storageBytes: storageTotalBytes._sum.sizeBytes || 0,
      },
      recentTenants,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
