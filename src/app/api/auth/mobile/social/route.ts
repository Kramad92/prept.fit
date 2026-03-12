import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { SignJWT } from "jose";
import { OAuth2Client } from "google-auth-library";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret"
);

const ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60; // 30 days

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Apple's public key set for verifying ID tokens
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys")
);

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

async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: [
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_IOS_CLIENT_ID || "",
      process.env.GOOGLE_ANDROID_CLIENT_ID || "",
    ].filter(Boolean),
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token");
  }
  return {
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    providerAccountId: payload.sub,
  };
}

async function verifyAppleToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: process.env.APPLE_CLIENT_ID,
  });
  const email = payload.email as string;
  if (!email) {
    throw new Error("Invalid Apple token — no email");
  }
  return {
    email,
    name: (payload.name as string) || email.split("@")[0],
    providerAccountId: payload.sub as string,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider, idToken } = body;

    if (!provider || !idToken) {
      return NextResponse.json(
        { error: "Provider and idToken are required" },
        { status: 400 }
      );
    }

    if (provider !== "google" && provider !== "apple") {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    // Verify the ID token with the provider
    let verified: { email: string; name: string; providerAccountId: string };
    try {
      if (provider === "google") {
        verified = await verifyGoogleToken(idToken);
      } else {
        verified = await verifyAppleToken(idToken);
      }
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verified.email },
      include: { tenant: true, clientProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "NO_ACCOUNT", message: "No account found. Please register on the web first." },
        { status: 404 }
      );
    }

    // Block inactive clients
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

    // Link OAuth account if not already linked
    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: verified.providerAccountId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        provider,
        providerAccountId: verified.providerAccountId,
      },
    });

    // Mark email as verified
    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
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

    // Generate access token
    const accessToken = await generateAccessToken(userPayload);

    // Generate refresh token
    const rawRefreshToken = randomBytes(64).toString("hex");
    const hashedRefreshToken = hashToken(rawRefreshToken);

    // Clean up old refresh tokens (keep max 5)
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
    console.error("Mobile social auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
