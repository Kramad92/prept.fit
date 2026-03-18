import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { prankPopup: true },
    });

    if (!user?.prankPopup) {
      return NextResponse.json({ prank: null });
    }

    const raw = user.prankPopup as Record<string, unknown>;

    // Check enabled flag (default true for backwards compat)
    if (raw.enabled === false) {
      return NextResponse.json({ prank: null });
    }

    // Normalize image URLs
    const imageUrls = Array.isArray(raw.imageUrls)
      ? raw.imageUrls
      : raw.imageUrl
        ? [raw.imageUrl]
        : [];

    if (imageUrls.length === 0) {
      return NextResponse.json({ prank: null });
    }

    return NextResponse.json({
      prank: {
        imageUrls,
        message: raw.message || null,
        mode: raw.mode || "navigation",
      },
    });
  } catch (err: unknown) {
    console.error("[prank-popup] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
