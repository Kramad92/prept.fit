import { NextResponse } from "next/server";

type LimiterType = "auth" | "email" | "ai" | "upload" | "public";

const LIMITS: Record<LimiterType, { tokens: number; window: string }> = {
  auth: { tokens: 5, window: "15 m" },
  email: { tokens: 100, window: "1 h" },
  ai: { tokens: 20, window: "1 h" },
  upload: { tokens: 30, window: "1 h" },
  public: { tokens: 5, window: "15 m" },
};

// Lazy-initialized to avoid module-load side effects during Next.js build
let _limiters: Record<string, any> | null = null;

async function getLimiter(type: LimiterType) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;

  if (!_limiters) {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    _limiters = {};
    for (const [key, cfg] of Object.entries(LIMITS)) {
      _limiters[key] = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window as any),
      });
    }
  }

  return _limiters[type] || null;
}

/**
 * Check rate limit. Returns null if allowed, or a 429 NextResponse if blocked.
 * If Redis isn't configured, always allows (graceful degradation).
 */
export async function rateLimit(
  type: LimiterType,
  key: string
): Promise<NextResponse | null> {
  try {
    const limiter = await getLimiter(type);
    if (!limiter) return null;

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
