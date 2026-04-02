import { Queue } from "bullmq";
import { env } from "../config/env.js";

const connection = { url: env.REDIS_URL };

// ─── Queues ─────────────────────────────────────────────────

export const emailQueue = new Queue("email", { connection });
export const aiQueue = new Queue("ai", { connection });
export const uploadQueue = new Queue("upload", { connection });
export const notificationQueue = new Queue("notification", { connection });

// ─── Job data types ─────────────────────────────────────────

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface AiJobData {
  type: "verify-workout-log" | "verify-nutrition-log" | "batch-verify-nutrition" | "generate-feedback";
  tenantId: string;
  userId: string;
  payload: Record<string, unknown>;
}

export interface UploadJobData {
  type: "process-video" | "generate-thumbnail" | "compress-image";
  key: string;
  tenantId: string;
  options?: Record<string, unknown>;
}

export interface NotificationJobData {
  userId: string;
  tenantId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  pushToken?: string;
}

// ─── Enqueue helpers ────────────────────────────────────────

export async function enqueueEmail(data: EmailJobData) {
  return emailQueue.add("send", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function enqueueAiTask(data: AiJobData) {
  return aiQueue.add(data.type, data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function enqueueUpload(data: UploadJobData) {
  return uploadQueue.add(data.type, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function enqueueNutritionVerification(
  nutritionLogId: string,
  tenantId: string,
  clientId: string
) {
  return aiQueue.add(
    "verify-nutrition-log",
    {
      type: "verify-nutrition-log" as const,
      tenantId,
      userId: clientId,
      payload: { nutritionLogId },
    },
    {
      jobId: `verify-nutlog-${nutritionLogId}`,
      delay: 30_000,
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: true,
      removeOnFail: 100,
    }
  );
}

export async function setupRepeatableJobs() {
  await aiQueue.add(
    "batch-verify-nutrition",
    {
      type: "batch-verify-nutrition" as const,
      tenantId: "",
      userId: "",
      payload: {},
    },
    {
      repeat: { pattern: "0 */6 * * *" },
      jobId: "batch-verify-nutrition",
      removeOnComplete: true,
    }
  );
}

export async function enqueueNotification(data: NotificationJobData) {
  return notificationQueue.add("send", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 500 },
  });
}
