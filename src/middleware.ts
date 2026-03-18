import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

// Routes that require authentication
const protectedPatterns = [
  "/dashboard",
  "/portal",
  "/admin",
  "/api/clients",
  "/api/schedules",
  "/api/workouts",
  "/api/settings",
  "/api/upload",
  "/api/portal",
  "/api/availability",
  "/api/booking",
  "/api/messages",
  "/api/check-ins",
  "/api/habits",
  "/api/workout-logs",
  "/api/notifications",
  "/api/meal-plans",
  "/api/nutrition-logs",
  "/api/exercise-library",
  "/api/food-library",
  "/api/payments",
  "/api/exercise-categories",
  "/api/equipment-types",
  "/api/training-groups",
  "/api/group-sessions",
  "/api/search",
  "/api/admin",
];

function isProtectedRoute(pathname: string): boolean {
  return protectedPatterns.some(
    (pattern) => pathname === pattern || pathname.startsWith(pattern + "/")
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip auth check for non-protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for Bearer token first (mobile app)
  // Just verify it's valid — getSession() will re-verify and extract claims
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      await jwtVerify(token, getJwtSecret());
      return NextResponse.next();
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Fall back to NextAuth session (web app)
  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!nextAuthToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Redirect to login for page routes
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based path guards
  const role = nextAuthToken.role as string;

  // Admin can only access /admin and /api/admin
  if (role === "ADMIN" && !pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Coach/Client cannot access /admin
  if (role !== "ADMIN" && (pathname.startsWith("/admin") || pathname.startsWith("/api/admin"))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // CLIENT users cannot access coach dashboard — redirect to portal
  if (role === "CLIENT" && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/portal", req.url));
  }

  // COACH users cannot access client portal — redirect to dashboard
  if (role === "COACH" && pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal/:path*",
    "/admin/:path*",
    "/api/clients/:path*",
    "/api/schedules/:path*",
    "/api/workouts/:path*",
    "/api/settings/:path*",
    "/api/upload/:path*",
    "/api/portal/:path*",
    "/api/availability/:path*",
    "/api/booking/:path*",
    "/api/messages/:path*",
    "/api/check-ins/:path*",
    "/api/habits/:path*",
    "/api/workout-logs/:path*",
    "/api/notifications/:path*",
    "/api/meal-plans/:path*",
    "/api/nutrition-logs/:path*",
    "/api/exercise-library/:path*",
    "/api/food-library/:path*",
    "/api/payments/:path*",
    "/api/exercise-categories/:path*",
    "/api/equipment-types/:path*",
    "/api/training-groups/:path*",
    "/api/group-sessions/:path*",
    "/api/search/:path*",
    "/api/admin/:path*",
  ],
};
