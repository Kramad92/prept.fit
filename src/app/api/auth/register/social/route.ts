import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { name, businessName, email, provider } = await req.json();

    if (!name || !businessName || !email || !provider) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
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

    // Create tenant + user (no password — social auth only)
    const tenant = await prisma.tenant.create({
      data: {
        name: businessName,
        slug,
        email,
        users: {
          create: {
            name,
            email,
            role: "COACH",
            emailVerified: new Date(),
            // No passwordHash — OAuth user
          },
        },
      },
      include: { users: true },
    });

    return NextResponse.json(
      { id: tenant.id, slug: tenant.slug },
      { status: 201 }
    );
  } catch (error) {
    console.error("Social registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
