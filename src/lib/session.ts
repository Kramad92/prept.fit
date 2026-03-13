import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { jwtVerify } from "jose";
import { authOptions } from "./auth";

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}

export async function getSession() {
  // Check for Bearer token first (mobile) — verify JWT directly
  // NextResponse.next({ request: { headers } }) doesn't reliably propagate
  // custom headers to headers() in Next.js 14, so we verify the token here.
  const headersList = headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, getJwtSecret());
      // Token verified — proceed with session
      return {
        user: {
          id: payload.sub as string,
          email: (payload.email as string) || "",
          name: (payload.name as string) || "",
          role: payload.role as any,
          tenantId: (payload.tenantId as string) || "",
          tenantSlug: (payload.tenantSlug as string) || "",
          clientProfileId: (payload.clientProfileId as string) || null,
        },
      };
    } catch {
      // Invalid token — fall through to NextAuth
    }
  }

  // Fall back to NextAuth session (web)
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireCoach() {
  const session = await getSession();
  if (!session || session.user.role !== "COACH" || !session.user.tenantId) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireClient() {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId || !session.user.tenantId) {
    throw new Error("Unauthorized");
  }
  return session;
}
