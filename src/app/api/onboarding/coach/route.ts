import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody, coachOnboardingSchema } from "@/lib/validations";

export async function PUT(req: Request) {
  try {
    const session = await requireCoach();
    const parsed = await validateBody(req, coachOnboardingSchema);
    if ("error" in parsed) return parsed.error;

    const { coachPhoto, bio, logo, timezone, locale, units, currency } = parsed.data;

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: {
        ...(coachPhoto !== undefined && { coachPhoto }),
        ...(bio !== undefined && { bio }),
        ...(logo !== undefined && { logo }),
        ...(timezone !== undefined && { timezone }),
        ...(locale !== undefined && { locale }),
        ...(units !== undefined && { units }),
        ...(currency !== undefined && { currency }),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
