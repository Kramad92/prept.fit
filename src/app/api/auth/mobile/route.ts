import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

// Access token: 15 minutes
const ACCESS_TOKEN_EXPIRY = 15 * 60;
// Refresh token: 30 days
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function generateAccessToken(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantSlug: string;
  clientProfileId: string | null;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    clientProfileId: user.clientProfileId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY}s`)
    .sign(JWT_SECRET);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true, clientProfile: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Block inactive clients from logging in
    if (
      user.role === "CLIENT" &&
      user.clientProfile &&
      user.clientProfile.status !== "active"
    ) {
      return NextResponse.json(
        { error: "PORTAL_DISABLED" },
        { status: 403 }
      );
    }

    // Block unverified coaches
    if (user.role === "COACH" && !user.emailVerified) {
      return NextResponse.json(
        { error: "EMAIL_NOT_VERIFIED" },
        { status: 403 }
      );
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      tenantSlug: user.tenant.slug,
      clientProfileId: user.clientProfile?.id || null,
    };

    // Generate access token (JWT)
    const accessToken = await generateAccessToken(userPayload);

    // Generate refresh token (random + stored hashed in DB)
    const rawRefreshToken = randomBytes(64).toString("hex");
    const hashedRefreshToken = hashToken(rawRefreshToken);

    // Clean up old refresh tokens for this user (keep max 5)
    const existingTokens = await prisma.refreshToken.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (existingTokens.length >= 5) {
      const toDelete = existingTokens.slice(4).map((t) => t.id);
      await prisma.refreshToken.deleteMany({
        where: { id: { in: toDelete } },
      });
    }

    // Store new refresh token
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000),
      },
    });

    return NextResponse.json({
      accessToken,
      refreshToken: rawRefreshToken,
      user: userPayload,
    });
  } catch (error) {
    console.error("Mobile auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
