import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { addDays, format, startOfDay, getDay } from "date-fns";

// Returns available booking slots for the next N days
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const daysAhead = parseInt(searchParams.get("days") || "14");

  // Get coach availability rules
  const availability = await prisma.availability.findMany({
    where: { tenantId: session.user.tenantId, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // Get existing bookings in the date range
  const today = startOfDay(new Date());
  const endDate = addDays(today, daysAhead);

  const existingBookings = await prisma.schedule.findMany({
    where: {
      tenantId: session.user.tenantId,
      date: { gte: today, lt: endDate },
      status: { not: "cancelled" },
    },
    select: { date: true, startTime: true, endTime: true },
  });

  // Build a set of booked time slots for quick lookup
  const bookedSet = new Set(
    existingBookings.map(
      (b) => `${format(b.date, "yyyy-MM-dd")}_${b.startTime}`
    )
  );

  // Generate available slots
  const slots: Array<{ date: string; startTime: string; endTime: string }> = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    const dayOfWeek = getDay(date);
    const dateStr = format(date, "yyyy-MM-dd");

    const dayRules = availability.filter((a) => a.dayOfWeek === dayOfWeek);

    for (const rule of dayRules) {
      // Generate individual slots from the availability window
      const [startH, startM] = rule.startTime.split(":").map(Number);
      const [endH, endM] = rule.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m + rule.slotMinutes <= endMinutes; m += rule.slotMinutes) {
        const slotStart = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        const slotEnd = `${String(Math.floor((m + rule.slotMinutes) / 60)).padStart(2, "0")}:${String((m + rule.slotMinutes) % 60).padStart(2, "0")}`;

        const key = `${dateStr}_${slotStart}`;

        // Skip if already booked or in the past
        if (!bookedSet.has(key)) {
          const slotDate = new Date(date);
          slotDate.setHours(Math.floor(m / 60), m % 60);
          if (slotDate > new Date()) {
            slots.push({ date: dateStr, startTime: slotStart, endTime: slotEnd });
          }
        }
      }
    }
  }

  return NextResponse.json(slots);
}
