import { prisma } from "./prisma";

export async function logAiUsage({
  tenantId,
  endpoint,
  tokensIn = 0,
  tokensOut = 0,
  provider = "unknown",
}: {
  tenantId: string;
  endpoint: string;
  tokensIn?: number;
  tokensOut?: number;
  provider?: string;
}) {
  try {
    await prisma.aiUsageLog.create({
      data: { tenantId, endpoint, tokensIn, tokensOut, provider },
    });
  } catch (e) {
    console.error("Failed to log AI usage:", e);
  }
}

export async function logStorageUsage({
  tenantId,
  fileKey,
  sizeBytes,
  folder = "uploads",
}: {
  tenantId: string;
  fileKey: string;
  sizeBytes: number;
  folder?: string;
}) {
  try {
    await prisma.storageUsageLog.create({
      data: { tenantId, fileKey, sizeBytes, folder },
    });
  } catch (e) {
    console.error("Failed to log storage usage:", e);
  }
}
