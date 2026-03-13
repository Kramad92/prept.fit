import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const [aiLogs, storageLogs, storageTotal] = await Promise.all([
      prisma.aiUsageLog.findMany({
        where: { tenantId: params.id },
        orderBy: { createdAt: "desc" },
        take: 50,
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
      ai: { logs: aiLogs, totalCalls: aiLogs.length },
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
