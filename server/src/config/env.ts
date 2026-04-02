import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // R2 / S3
  S3_BUCKET_NAME: z.string(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_ENDPOINT: z.string().url(),
  S3_PUBLIC_URL: z.string().url(),

  // Email
  RESEND_API_KEY: z.string(),

  // External
  USDA_API_KEY: z.string(),

  // AI providers (for background verification jobs)
  AI_PROVIDER: z.string().default("groq"),
  AI_API_KEY: z.string().default(""),
  AI_FALLBACK_PROVIDER: z.string().optional(),
  AI_FALLBACK_API_KEY: z.string().optional(),

  // Redis — BullMQ needs native Redis protocol, not Upstash REST
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Upstash (rate limiting only)
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
