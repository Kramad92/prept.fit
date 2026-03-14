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
    const url = new URL(req.url);
    const days = Math.min(365, Math.max(1, parseInt(url.searchParams.get("days") || "30") || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      aiByTenant,
      storageByTenant,
      aiByEndpoint,
      aiByProvider,
      aiTimeline,
      totalTokens,
    ] = await Promise.all([
      prisma.aiUsageLog.groupBy({
        by: ["tenantId"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.storageUsageLog.groupBy({
        by: ["tenantId"],
        _count: true,
        _sum: { sizeBytes: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["endpoint"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.aiUsageLog.groupBy({
        by: ["provider"],
        where: { createdAt: { gte: since } },
        _count: true,
        _sum: { tokensIn: true, tokensOut: true },
      }),
      prisma.$queryRaw<{ date: string; calls: bigint; tokens_in: bigint; tokens_out: bigint }[]>`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as calls,
          COALESCE(SUM("tokensIn"), 0) as tokens_in,
          COALESCE(SUM("tokensOut"), 0) as tokens_out
        FROM "ai_usage_logs"
        WHERE "createdAt" >= ${since}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      prisma.aiUsageLog.aggregate({ _sum: { tokensIn: true, tokensOut: true }, _count: true }),
    ]);

    const tenantIds = Array.from(new Set([
      ...aiByTenant.map((a) => a.tenantId),
      ...storageByTenant.map((s) => s.tenantId),
    ]));
    const tenants = await prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true, slug: true },
    });
    const tenantMap = new Map(tenants.map((t) => [t.id, t]));

    const perTenant = tenantIds.map((id) => {
      const tenant = tenantMap.get(id);
      const ai = aiByTenant.find((a) => a.tenantId === id);
      const storage = storageByTenant.find((s) => s.tenantId === id);
      return {
        tenantId: id,
        name: tenant?.name || "Unknown",
        slug: tenant?.slug || "",
        ai: {
          calls: ai?._count || 0,
          tokensIn: ai?._sum.tokensIn || 0,
          tokensOut: ai?._sum.tokensOut || 0,
        },
        storage: {
          files: storage?._count || 0,
          bytes: Number(storage?._sum.sizeBytes || 0),
        },
      };
    });

    perTenant.sort((a, b) => b.ai.calls - a.ai.calls);

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      totals: {
        aiCalls: totalTokens._count,
        tokensIn: totalTokens._sum.tokensIn || 0,
        tokensOut: totalTokens._sum.tokensOut || 0,
      },
      perTenant,
      byEndpoint: aiByEndpoint.map((e) => ({
        endpoint: e.endpoint,
        calls: e._count,
        tokensIn: e._sum.tokensIn || 0,
        tokensOut: e._sum.tokensOut || 0,
      })),
      byProvider: aiByProvider.map((p) => ({
        provider: p.provider,
        calls: p._count,
        tokensIn: p._sum.tokensIn || 0,
        tokensOut: p._sum.tokensOut || 0,
      })),
      timeline: aiTimeline.map((d) => ({
        date: String(d.date),
        calls: Number(d.calls),
        tokensIn: Number(d.tokens_in),
        tokensOut: Number(d.tokens_out),
      })),
    });
  } catch (err: unknown) {
    console.error("[admin/usage] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
