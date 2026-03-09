import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, addDays,
} from "date-fns";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const in7Days = addDays(now, 7);

  const [
    clients,
    planCount,
    mealPlanCount,
    weekSessions,
    todaySessions,
    pendingPayments,
    overduePayments,
    monthPaidPayments,
    // New queries
    unreadMessages,
    weekCheckIns,
    expiringWorkoutPlans,
    weekWorkoutLogs,
    weekAssignedPlans,
    recentActivity,
  ] = await Promise.all([
    // Existing
    prisma.client.findMany({
      where: { tenantId },
      select: {
        id: true, name: true, status: true, goals: true, createdAt: true,
        email: true, phone: true, gender: true, dateOfBirth: true,
        fitnessLevel: true, activityLevel: true, userId: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutPlan.count({ where: { tenantId } }),
    prisma.mealPlan.count({ where: { tenantId } }),
    prisma.schedule.count({
      where: { tenantId, date: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.schedule.findMany({
      where: { tenantId, date: { gte: todayStart, lte: todayEnd } },
      include: { client: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.payment.findMany({
      where: { client: { tenantId }, status: "pending" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { client: { tenantId }, status: "overdue" },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.payment.aggregate({
      where: {
        client: { tenantId }, status: "paid",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
      _count: true,
    }),

    // 1. Unread messages (from clients to coach)
    prisma.message.findMany({
      where: {
        tenantId,
        isRead: false,
        sender: { role: "CLIENT" },
      },
      include: {
        client: { select: { id: true, name: true } },
        sender: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // 2. Check-ins submitted this week
    prisma.checkIn.findMany({
      where: {
        client: { tenantId },
        submittedAt: { gte: weekStart, lte: weekEnd },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),

    // 5. Expiring workout plans (endDate within 7 days)
    prisma.clientWorkoutPlan.findMany({
      where: {
        client: { tenantId },
        isActive: true,
        endDate: { gte: todayStart, lte: in7Days },
      },
      include: {
        client: { select: { id: true, name: true } },
        workoutPlan: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    }),

    // 6a. Workout logs this week (completed)
    prisma.workoutLog.count({
      where: {
        client: { tenantId },
        date: { gte: weekStart, lte: weekEnd },
        completed: true,
      },
    }),

    // 6b. Active assigned plans (to calc completion rate)
    prisma.clientWorkoutPlan.count({
      where: {
        client: { tenantId, status: "active" },
        isActive: true,
      },
    }),

    // 7. Recent activity feed — combine latest events
    Promise.all([
      // Recent payments
      prisma.payment.findMany({
        where: { client: { tenantId }, status: "paid" },
        include: { client: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 5,
      }),
      // Recent workout logs
      prisma.workoutLog.findMany({
        where: { client: { tenantId }, completed: true },
        include: {
          client: { select: { name: true } },
          workoutPlan: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 5,
      }),
      // Recent check-ins
      prisma.checkIn.findMany({
        where: { client: { tenantId } },
        include: { client: { select: { name: true } } },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
      // Recent messages (from clients)
      prisma.message.findMany({
        where: { tenantId, sender: { role: "CLIENT" } },
        include: { client: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]),
  ]);

  const activeClients = clients.filter((c) => c.status === "active");

  // Profile completeness
  const profileFields = ["email", "phone", "gender", "dateOfBirth", "fitnessLevel", "activityLevel", "goals"] as const;
  const clientProfiles = activeClients.map((c) => {
    const filled = profileFields.filter((f) => c[f] != null && c[f] !== "").length;
    return { id: c.id, name: c.name, filled, total: profileFields.length, hasPortalAccess: !!c.userId };
  });
  const incompleteProfiles = clientProfiles.filter((c) => c.filled < c.total);
  const noPortalAccess = clientProfiles.filter((c) => !c.hasPortalAccess);

  // 3. Upcoming birthdays (next 30 days)
  const today = new Date();
  const upcomingBirthdays = activeClients
    .filter((c) => c.dateOfBirth)
    .map((c) => {
      const dob = new Date(c.dateOfBirth!);
      // Next birthday this year or next
      const thisYearBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (thisYearBday < todayStart) {
        thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
      }
      const daysUntil = Math.floor((thisYearBday.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      const age = thisYearBday.getFullYear() - dob.getFullYear();
      return { id: c.id, name: c.name, date: thisYearBday.toISOString(), daysUntil, turningAge: age };
    })
    .filter((b) => b.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  // Group unread messages by client
  const unreadByClient = new Map<string, { clientId: string; clientName: string; count: number; latest: string }>();
  for (const msg of unreadMessages) {
    const key = msg.client.id;
    const existing = unreadByClient.get(key);
    if (existing) {
      existing.count++;
    } else {
      unreadByClient.set(key, {
        clientId: msg.client.id,
        clientName: msg.client.name,
        count: 1,
        latest: msg.createdAt.toISOString(),
      });
    }
  }

  // 7. Build activity feed
  const [recentPaymentsList, recentWorkoutLogs, recentCheckIns, recentMessages] = recentActivity;
  const activityFeed = [
    ...recentPaymentsList.map((p) => ({
      type: "payment" as const,
      text: p.client.name,
      detail: `${p.amount.toFixed(2)} ${p.currency}`,
      date: p.date.toISOString(),
    })),
    ...recentWorkoutLogs.map((w) => ({
      type: "workout" as const,
      text: w.client.name,
      detail: w.workoutPlan.name,
      date: w.date.toISOString(),
    })),
    ...recentCheckIns.map((c) => ({
      type: "checkin" as const,
      text: c.client.name,
      detail: null as string | null,
      date: c.submittedAt.toISOString(),
    })),
    ...recentMessages.map((m) => ({
      type: "message" as const,
      text: m.client.name,
      detail: m.content.length > 60 ? m.content.slice(0, 60) + "…" : m.content,
      date: m.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return NextResponse.json(
    {
      clientCount: activeClients.length,
      totalClients: clients.length,
      planCount,
      mealPlanCount,
      weekSessions,
      todaySessions: todaySessions.map((s) => ({
        id: s.id,
        title: s.title,
        date: s.date.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        clientName: s.client.name,
      })),
      recentClients: clients.slice(0, 5).map((c) => ({
        id: c.id, name: c.name, status: c.status, goals: c.goals,
      })),
      payments: {
        pendingCount: pendingPayments.length,
        pendingTotal: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        overdueCount: overduePayments.length,
        overdueTotal: overduePayments.reduce((sum, p) => sum + p.amount, 0),
        monthCollected: monthPaidPayments._sum.amount || 0,
        monthCount: monthPaidPayments._count,
        pendingList: pendingPayments.map((p) => ({
          id: p.id, amount: p.amount, currency: p.currency,
          dueDate: p.dueDate?.toISOString() || null,
          description: p.description, clientName: p.client.name, clientId: p.client.id,
        })),
        overdueList: overduePayments.map((p) => ({
          id: p.id, amount: p.amount, currency: p.currency,
          dueDate: p.dueDate?.toISOString() || null,
          description: p.description, clientName: p.client.name, clientId: p.client.id,
        })),
      },
      profileStats: {
        incomplete: incompleteProfiles.slice(0, 5),
        incompleteCount: incompleteProfiles.length,
        noPortalCount: noPortalAccess.length,
        totalActive: activeClients.length,
      },
      // New data
      unreadMessages: {
        total: unreadMessages.length,
        byClient: Array.from(unreadByClient.values()),
      },
      birthdays: upcomingBirthdays,
      expiringPlans: expiringWorkoutPlans.map((p) => ({
        id: p.id,
        clientName: p.client.name,
        clientId: p.client.id,
        planName: p.workoutPlan.name,
        endDate: p.endDate?.toISOString() || null,
      })),
      weeklyWorkoutCompletion: {
        logged: weekWorkoutLogs,
        activePlans: weekAssignedPlans,
      },
      checkIns: weekCheckIns.map((c) => ({
        id: c.id,
        clientName: c.client.name,
        clientId: c.client.id,
        submittedAt: c.submittedAt.toISOString(),
      })),
      activityFeed,
    },
    { headers: { "Cache-Control": "private, max-age=5, stale-while-revalidate=30" } }
  );
}
