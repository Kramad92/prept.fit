import { NextResponse } from "next/server";
import { requireClient } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBody, clientOnboardingSchema } from "@/lib/validations";

export async function PUT(req: Request) {
  try {
    const session = await requireClient();
    const parsed = await validateBody(req, clientOnboardingSchema);
    if ("error" in parsed) return parsed.error;

    const { goals, fitnessLevel, activityLevel, injuries, allergies, dietaryPrefs, gender, dateOfBirth, height, weight } = parsed.data;

    await prisma.client.update({
      where: {
        id: session.user.clientProfileId!,
        tenantId: session.user.tenantId,
      },
      data: {
        ...(goals !== undefined && { goals }),
        ...(fitnessLevel !== undefined && { fitnessLevel }),
        ...(activityLevel !== undefined && { activityLevel }),
        ...(injuries !== undefined && { injuries }),
        ...(allergies !== undefined && { allergies }),
        ...(dietaryPrefs !== undefined && { dietaryPrefs }),
        ...(gender !== undefined && { gender }),
        ...(dateOfBirth !== undefined && dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(height !== undefined && { height: height ? Number(height) : null }),
      },
    });

    // Create initial measurement if weight provided
    if (weight) {
      await prisma.measurement.create({
        data: {
          clientId: session.user.clientProfileId!,
          date: new Date(),
          weight: Number(weight),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
