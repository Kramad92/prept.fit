import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Fallback: in-memory store if Redis isn't configured (dev/testing)
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

function createLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null;
  return new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(tokens, window) });
}

// --- Limiters by category ---

// Auth: 5 attempts per 15 minutes per key (IP or email)
const authLimiter = createLimiter(5, "15 m");

// Email sending: 3 emails per hour per key
const emailLimiter = createLimiter(3, "1 h");

// AI generation: 20 calls per hour per tenant
const aiLimiter = createLimiter(20, "1 h");

// File uploads: 30 uploads per hour per tenant
const uploadLimiter = createLimiter(30, "1 h");

// Public endpoints (inquiries): 5 per 15 min per IP
const publicLimiter = createLimiter(5, "15 m");

type LimiterType = "auth" | "email" | "ai" | "upload" | "public";

const limiters: Record<LimiterType, Ratelimit | null> = {
  auth: authLimiter,
  email: emailLimiter,
  ai: aiLimiter,
  upload: uploadLimiter,
  public: publicLimiter,
};

/**
 * Check rate limit. Returns null if allowed, or a 429 NextResponse if blocked.
 * If Redis isn't configured, always allows (graceful degradation).
 *
 * @param type - Which limiter category to use
 * @param key  - Unique identifier (IP, email, tenantId, etc.)
 */
export async function rateLimit(
  type: LimiterType,
  key: string
): Promise<NextResponse | null> {
  const limiter = limiters[type];
  if (!limiter) return null; // Redis not configured — allow

  try {
    const { success, reset } = await limiter.limit(key);
    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }
    return null;
  } catch {
    // Redis error — fail open (don't block users due to infra issues)
    return null;
  }
}

/**
 * Extract client IP from request headers (works on Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
