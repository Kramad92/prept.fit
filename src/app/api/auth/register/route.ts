import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { name, businessName, email, password } = await req.json();

  if (!name || !businessName || !email || !password) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 }
    );
  }

  // Create slug from business name
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Check slug uniqueness
  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    return NextResponse.json(
      { error: "Business name is already taken" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.create({
    data: {
      name: businessName,
      slug,
      email,
      users: {
        create: {
          name,
          email,
          passwordHash,
          role: "COACH",
        },
      },
    },
    include: { users: true },
  });

  // Send verification email
  const user = tenant.users[0];
  const token = randomBytes(32).toString("hex");

  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  try {
    await sendVerificationEmail({
      to: email,
      name,
      verificationUrl: `${baseUrl}/verify-email/${token}`,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return NextResponse.json(
    { id: tenant.id, slug: tenant.slug },
    { status: 201 }
  );
}
