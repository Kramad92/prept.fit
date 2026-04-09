import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

function getJwtSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET environment variable is required");
  return new TextEncoder().encode(secret);
}
const ACCESS_TOKEN_EXPIRY = 15 * 60;
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("auth", getClientIp(req));
    if (rl) return rl;

    let body;
    try { body = await req.json(); } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : "";

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(refreshToken);

    // Find and validate refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: {
        user: {
          include: { tenant: true, clientProfiles: true },
        },
      },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401 }
      );
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { error: "Refresh token expired" },
        { status: 401 }
      );
    }

    const user = storedToken.user;

    // Find active client profile for current tenant
    const activeProfile = user.role === "CLIENT"
      ? user.clientProfiles.find((cp) => cp.tenantId === user.tenantId && cp.status === "active")
        || user.clientProfiles.find((cp) => cp.status === "active")
      : null;

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: activeProfile?.tenantId || user.tenantId || "",
      tenantSlug: user.tenant?.slug || "",
      clientProfileId: activeProfile?.id || null,
    };

    // Generate new access token
    const accessToken = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: activeProfile?.tenantId || user.tenantId || "",
      tenantSlug: user.tenant?.slug || "",
      clientProfileId: activeProfile?.id || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
      .sign(getJwtSecret());

    // Rotate refresh token: delete old, create new
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const newRawRefreshToken = randomBytes(64).toString("hex");
    const newHashedToken = hashToken(newRawRefreshToken);

    await prisma.refreshToken.create({
      data: {
        token: newHashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000),
      },
    });

    return NextResponse.json({
      accessToken,
      refreshToken: newRawRefreshToken,
      user: userPayload,
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
