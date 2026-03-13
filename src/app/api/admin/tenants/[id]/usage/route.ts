import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [aiLogs, aiTotals, aiByEndpoint, storageLogs, storageTotal] = await Promise.all([
      prisma.aiUsageLog.findMany({
        where: { tenantId: params.id, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.aiUsageLog.aggregate({
        where: { tenantId: params.id, createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["endpoint"],
        where: { tenantId: params.id, createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.storageUsageLog.findMany({
        where: { tenantId: params.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.storageUsageLog.aggregate({
        where: { tenantId: params.id },
        _sum: { sizeBytes: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      ai: {
        logs: aiLogs,
        totalCalls: aiTotals._count,
        tokensIn: aiTotals._sum.tokensIn || 0,
        tokensOut: aiTotals._sum.tokensOut || 0,
        byEndpoint: aiByEndpoint.map((e) => ({
          endpoint: e.endpoint,
          calls: e._count,
          tokensIn: e._sum.tokensIn || 0,
          tokensOut: e._sum.tokensOut || 0,
        })),
      },
      storage: {
        logs: storageLogs,
        totalBytes: storageTotal._sum.sizeBytes || 0,
        totalFiles: storageTotal._count,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
