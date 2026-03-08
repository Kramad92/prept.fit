import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { jwtVerify } from "jose";
import { authOptions } from "./auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

export async function getSession() {
  // Check for Bearer token first (mobile) — verify JWT directly
  // NextResponse.next({ request: { headers } }) doesn't reliably propagate
  // custom headers to headers() in Next.js 14, so we verify the token here.
  const headersList = headers();
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const { payload } = await jwtVerify(token, JWT_SECRET);
      console.log("[session] Bearer token verified for user:", payload.sub);
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

export async function requireCoach() {
  const session = await getSession();
  if (!session || session.user.role !== "COACH") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireClient() {
  const session = await getSession();
  if (!session || session.user.role !== "CLIENT" || !session.user.clientProfileId) {
    throw new Error("Unauthorized");
  }
  return session;
}
