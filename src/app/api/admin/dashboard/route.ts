import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAdmin();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      tenantCount,
      clientCount,
      userCount,
      aiUsageCount,
      aiTokenTotals,
      aiUsageLast30d,
      storageTotalBytes,
      recentTenants,
      recentAiLogs,
      aiByEndpoint,
      aiByProvider,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.client.count(),
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.aiUsageLog.count(),
      prisma.aiUsageLog.aggregate({ _sum: { tokensIn: true, tokensOut: true } }),
      prisma.aiUsageLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
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
      prisma.aiUsageLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { tenant: { select: { name: true, slug: true } } },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["endpoint"],
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["provider"],
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
    ]);

    return NextResponse.json({
      stats: {
        tenants: tenantCount,
        clients: clientCount,
        users: userCount,
        aiCalls: aiUsageCount,
        aiCallsLast30d: aiUsageLast30d,
        totalTokensIn: aiTokenTotals._sum.tokensIn || 0,
        totalTokensOut: aiTokenTotals._sum.tokensOut || 0,
        storageBytes: storageTotalBytes._sum.sizeBytes || 0,
      },
      recentTenants,
      recentAiLogs,
      aiByEndpoint: aiByEndpoint.map((e) => ({
        endpoint: e.endpoint,
        calls: e._count,
        tokensIn: e._sum.tokensIn || 0,
        tokensOut: e._sum.tokensOut || 0,
      })),
      aiByProvider: aiByProvider.map((p) => ({
        provider: p.provider,
        calls: p._count,
        tokensIn: p._sum.tokensIn || 0,
        tokensOut: p._sum.tokensOut || 0,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
