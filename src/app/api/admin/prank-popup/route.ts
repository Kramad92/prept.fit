import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET — list all users with an active prank popup
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { prankPopup: { not: Prisma.DbNull } },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        prankPopup: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (err: unknown) {
    console.error("[admin/prank-popup] GET Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — set prank popup for a user by email
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { email, imageUrls, message } = body;

    if (!email || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "email and at least one imageUrl are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { email },
      data: {
        prankPopup: { imageUrls, message: message || null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        prankPopup: true,
      },
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (err: unknown) {
    console.error("[admin/prank-popup] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove prank popup for a user by email
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { email },
      data: { prankPopup: Prisma.DbNull },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[admin/prank-popup] DELETE Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
