import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, addDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.groupSessionParticipant.deleteMany();
  await prisma.groupSession.deleteMany();
  await prisma.trainingGroupMember.deleteMany();
  await prisma.trainingGroup.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.package.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.inviteToken.deleteMany();
  await prisma.nutritionLog.deleteMany();
  await prisma.clientMealPlan.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.habitLog.deleteMany();
  await prisma.clientHabit.deleteMany();
  await prisma.habitTemplate.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.checkInTemplate.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.workoutLogEntry.deleteMany();
  await prisma.workoutLog.deleteMany();
  await prisma.clientWorkoutPlan.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.progressPhoto.deleteMany();
  await prisma.measurement.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.exerciseLibrary.deleteMany();
  await prisma.exerciseCategory.deleteMany();
  await prisma.equipmentType.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const hash = await bcrypt.hash("password123", 12);
  const today = startOfDay(new Date());

  // ========== TENANT ==========
  const tenant = await prisma.tenant.create({
    data: {
      name: "FitPro Sarajevo",
      slug: "demo",
      bio: "Professional personal training studio in the heart of Sarajevo. Specializing in strength training, weight loss, and athletic performance.",
      email: "info@fitpro.ba",
      phone: "+387 61 123 456",
      website: "https://fitpro.ba",
      brandColor: "#124559",
      timezone: "Europe/Sarajevo",
    },
  });

  // ========== EXERCISE CATEGORIES & EQUIPMENT TYPES ==========
  const defaultCategories = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
  for (const name of defaultCategories) {
    await prisma.exerciseCategory.create({ data: { name, tenantId: tenant.id } });
  }

  const defaultEquipment = [
    "Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight", "Kettlebell",
    "Ab Wheel", "Treadmill", "Rower", "Bike", "Jump Rope", "Plyo Box",
    "Battle Ropes", "Sled",
  ];
  for (const name of defaultEquipment) {
    await prisma.equipmentType.create({ data: { name, tenantId: tenant.id } });
  }

  // ========== COACH USER ==========
  const coach = await prisma.user.create({
    data: {
      name: "Emir Kovačević",
      email: "coach@demo.com",
      passwordHash: hash,
      role: "COACH",
      tenantId: tenant.id,
    },
  });

  // ========== 6 CLIENTS ==========
  const clientsData = [
    { name: "Selma Mehić", email: "selma@example.com", phone: "+387 61 200 001", gender: "female", goals: "Lose 10kg, tone up, improve energy", status: "active" },
    { name: "Damir Mehmedović", email: "damir@example.com", phone: "+387 61 200 002", gender: "male", goals: "Build muscle mass, bench press 100kg", status: "active" },
    { name: "Lejla Bašić", email: "lejla@example.com", phone: "+387 61 200 003", gender: "female", goals: "Marathon preparation, improve endurance", status: "active" },
    { name: "Alen Hodžić", email: "alen@example.com", phone: "+387 61 200 004", gender: "male", goals: "Strength training, fix back pain, improve posture", status: "active" },
    { name: "Sara Delić", email: "sara@example.com", phone: "+387 61 200 005", gender: "female", goals: "Post-pregnancy fitness, core strength", status: "active" },
    { name: "Mirza Kapetanović", email: "mirza@example.com", phone: "+387 61 200 006", gender: "male", goals: "Athletic performance for football, speed & agility", status: "paused" },
  ];

  const clients = [];
  const clientUsers = [];

  for (const cd of clientsData) {
    const client = await prisma.client.create({
      data: { ...cd, tenantId: tenant.id },
    });
    clients.push(client);

    // Create portal accounts for first 4 clients
    if (clients.length <= 4) {
      const user = await prisma.user.create({
        data: {
          name: cd.name,
          email: cd.email,
          passwordHash: hash,
          role: "CLIENT",
          tenantId: tenant.id,
          clientProfile: { connect: { id: client.id } },
        },
      });
      clientUsers.push(user);
    }
  }

  const [selma, damir, lejla, alen, sara, mirza] = clients;

  // ========== WORKOUT PLANS ==========

  const upperBody = await prisma.workoutPlan.create({
    data: {
      name: "Upper Body Strength",
      description: "Compound upper body movements focused on chest, back, and shoulders. 3x per week.",
      isTemplate: true,
      tenantId: tenant.id,
      exercises: {
        create: [
          { name: "Barbell Bench Press", sets: 4, reps: "8-10", weight: "60kg", restSeconds: 90, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg", notes: "Keep shoulder blades pinched, arch lower back slightly" },
          { name: "Bent-Over Barbell Row", sets: 4, reps: "8-10", weight: "50kg", restSeconds: 90, orderIndex: 1, videoUrl: "https://www.youtube.com/watch?v=FWJR5Ve8bnQ", notes: "Pull to lower chest, squeeze shoulder blades" },
          { name: "Overhead Press", sets: 3, reps: "10-12", weight: "35kg", restSeconds: 60, orderIndex: 2, videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI" },
          { name: "Lat Pulldown", sets: 3, reps: "10-12", weight: "45kg", restSeconds: 60, orderIndex: 3, videoUrl: "https://www.youtube.com/watch?v=CAwf7n6Luuc" },
          { name: "Dumbbell Lateral Raise", sets: 3, reps: "12-15", weight: "8kg", restSeconds: 45, orderIndex: 4, videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo" },
          { name: "Face Pulls", sets: 3, reps: "15", weight: "15kg", restSeconds: 45, orderIndex: 5, videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk", notes: "External rotate at the top" },
          { name: "Barbell Curl", sets: 3, reps: "10-12", weight: "25kg", restSeconds: 45, orderIndex: 6, videoUrl: "https://www.youtube.com/watch?v=kwG2ipFRgfo" },
          { name: "Tricep Rope Pushdown", sets: 3, reps: "12-15", restSeconds: 45, orderIndex: 7, videoUrl: "https://www.youtube.com/watch?v=vB5OHsJ3EME" },
        ],
      },
    },
  });

  const lowerBody = await prisma.workoutPlan.create({
    data: {
      name: "Lower Body Power",
      description: "Heavy compound leg movements. Focus on progressive overload. 2x per week.",
      isTemplate: true,
      tenantId: tenant.id,
      exercises: {
        create: [
          { name: "Barbell Back Squat", sets: 4, reps: "6-8", weight: "80kg", restSeconds: 120, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=bEv6CCg2BC8", notes: "Below parallel, brace core hard" },
          { name: "Romanian Deadlift", sets: 4, reps: "8-10", weight: "70kg", restSeconds: 90, orderIndex: 1, videoUrl: "https://www.youtube.com/watch?v=7j-2w4-P14I", notes: "Feel the stretch in hamstrings, hinge at hips" },
          { name: "Bulgarian Split Squat", sets: 3, reps: "10 each", weight: "16kg DBs", restSeconds: 60, orderIndex: 2, videoUrl: "https://www.youtube.com/watch?v=2C-uNgKwPLE" },
          { name: "Leg Press", sets: 3, reps: "12-15", weight: "120kg", restSeconds: 60, orderIndex: 3, videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ" },
          { name: "Leg Curl", sets: 3, reps: "10-12", weight: "35kg", restSeconds: 45, orderIndex: 4, videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs" },
          { name: "Standing Calf Raise", sets: 4, reps: "15-20", weight: "40kg", restSeconds: 30, orderIndex: 5, videoUrl: "https://www.youtube.com/watch?v=-M4-G8p8fmc" },
        ],
      },
    },
  });

  const fullBody = await prisma.workoutPlan.create({
    data: {
      name: "Full Body Circuit",
      description: "High-intensity circuit for fat loss and conditioning. Minimal rest between exercises.",
      isTemplate: true,
      tenantId: tenant.id,
      exercises: {
        create: [
          { name: "Kettlebell Swing", sets: 4, reps: "15", weight: "16kg", restSeconds: 30, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=YSxHifyI6s8" },
          { name: "Push-ups", sets: 3, reps: "AMRAP", restSeconds: 30, orderIndex: 1, videoUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4" },
          { name: "Goblet Squat", sets: 3, reps: "12", weight: "16kg", restSeconds: 30, orderIndex: 2, videoUrl: "https://www.youtube.com/watch?v=MeIiIdhvXT4" },
          { name: "Dumbbell Row", sets: 3, reps: "10 each", weight: "14kg", restSeconds: 30, orderIndex: 3, videoUrl: "https://www.youtube.com/watch?v=roCP6wCXPqo" },
          { name: "Walking Lunges", sets: 3, reps: "12 each", weight: "10kg DBs", restSeconds: 30, orderIndex: 4, videoUrl: "https://www.youtube.com/watch?v=L8fvypPH0IA" },
          { name: "Plank", sets: 3, reps: "45 seconds", restSeconds: 30, orderIndex: 5, videoUrl: "https://www.youtube.com/watch?v=ASdvN_XEl_c", notes: "Keep hips level, squeeze glutes" },
          { name: "Mountain Climbers", sets: 3, reps: "20 each", restSeconds: 30, orderIndex: 6, videoUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM" },
          { name: "Burpees", sets: 3, reps: "10", restSeconds: 60, orderIndex: 7, videoUrl: "https://www.youtube.com/watch?v=dZgVxmf6jkA" },
        ],
      },
    },
  });

  const coreRehab = await prisma.workoutPlan.create({
    data: {
      name: "Core & Posture Rehab",
      description: "Gentle corrective exercises for back pain relief and core stability.",
      isTemplate: true,
      tenantId: tenant.id,
      exercises: {
        create: [
          { name: "Dead Bug", sets: 3, reps: "10 each", restSeconds: 30, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=4XLEnwUr1d8", notes: "Keep lower back pressed into floor" },
          { name: "Bird Dog", sets: 3, reps: "10 each", restSeconds: 30, orderIndex: 1, videoUrl: "https://www.youtube.com/watch?v=wiFNA3sqjCA" },
          { name: "Glute Bridge", sets: 3, reps: "15", restSeconds: 30, orderIndex: 2, videoUrl: "https://www.youtube.com/watch?v=OUgsJ8-Vi0E" },
          { name: "Cat-Cow Stretch", sets: 2, reps: "10", restSeconds: 20, orderIndex: 3, videoUrl: "https://www.youtube.com/watch?v=kqnua4rHVVA" },
          { name: "Pallof Press", sets: 3, reps: "10 each", weight: "10kg", restSeconds: 30, orderIndex: 4, videoUrl: "https://www.youtube.com/watch?v=AH_QZLm_0-s" },
          { name: "Side Plank", sets: 3, reps: "30 seconds each", restSeconds: 30, orderIndex: 5, videoUrl: "https://www.youtube.com/watch?v=K2VljzCC16g" },
        ],
      },
    },
  });

  const runnerPlan = await prisma.workoutPlan.create({
    data: {
      name: "Runner's Strength",
      description: "Supplementary strength work for marathon training. Injury prevention focus.",
      isTemplate: false,
      tenantId: tenant.id,
      exercises: {
        create: [
          { name: "Single Leg Squat (Box)", sets: 3, reps: "8 each", restSeconds: 60, orderIndex: 0, videoUrl: "https://www.youtube.com/watch?v=Uf5LQCGJMOY" },
          { name: "Hip Thrust", sets: 3, reps: "12", weight: "40kg", restSeconds: 60, orderIndex: 1, videoUrl: "https://www.youtube.com/watch?v=SEdqd1n0cvg" },
          { name: "Calf Raise (Single Leg)", sets: 3, reps: "15 each", restSeconds: 30, orderIndex: 2 },
          { name: "Copenhagen Plank", sets: 3, reps: "20 seconds each", restSeconds: 30, orderIndex: 3, videoUrl: "https://www.youtube.com/watch?v=AZ-eTKbN4KQ" },
          { name: "Step-ups", sets: 3, reps: "10 each", weight: "10kg DBs", restSeconds: 45, orderIndex: 4, videoUrl: "https://www.youtube.com/watch?v=dQqApCGd5Cw" },
        ],
      },
    },
  });

  // ========== ASSIGN WORKOUT PLANS ==========
  await prisma.clientWorkoutPlan.createMany({
    data: [
      { clientId: selma.id, workoutPlanId: fullBody.id, isActive: true },
      { clientId: damir.id, workoutPlanId: upperBody.id, isActive: true },
      { clientId: damir.id, workoutPlanId: lowerBody.id, isActive: true },
      { clientId: lejla.id, workoutPlanId: runnerPlan.id, isActive: true },
      { clientId: alen.id, workoutPlanId: coreRehab.id, isActive: true },
      { clientId: sara.id, workoutPlanId: fullBody.id, isActive: true },
      { clientId: mirza.id, workoutPlanId: lowerBody.id, isActive: true },
      { clientId: mirza.id, workoutPlanId: upperBody.id, isActive: true },
    ],
  });

  // ========== AVAILABILITY (Coach working hours) ==========
  const workDays = [1, 2, 3, 4, 5]; // Mon-Fri
  for (const day of workDays) {
    await prisma.availability.create({
      data: { dayOfWeek: day, startTime: "08:00", endTime: "12:00", slotMinutes: 60, tenantId: tenant.id },
    });
    await prisma.availability.create({
      data: { dayOfWeek: day, startTime: "14:00", endTime: "19:00", slotMinutes: 60, tenantId: tenant.id },
    });
  }
  // Saturday morning
  await prisma.availability.create({
    data: { dayOfWeek: 6, startTime: "09:00", endTime: "13:00", slotMinutes: 60, tenantId: tenant.id },
  });

  // ========== SCHEDULES (Past + Upcoming) ==========
  const sessionData = [
    // Past sessions
    { days: -14, time: "09:00", client: selma, status: "completed" },
    { days: -14, time: "11:00", client: damir, status: "completed" },
    { days: -13, time: "08:00", client: lejla, status: "completed" },
    { days: -12, time: "14:00", client: alen, status: "completed" },
    { days: -12, time: "16:00", client: sara, status: "completed" },
    { days: -10, time: "09:00", client: selma, status: "completed" },
    { days: -10, time: "15:00", client: mirza, status: "no-show" },
    { days: -7, time: "09:00", client: selma, status: "completed" },
    { days: -7, time: "11:00", client: damir, status: "completed" },
    { days: -6, time: "08:00", client: lejla, status: "completed" },
    { days: -5, time: "14:00", client: alen, status: "completed" },
    { days: -5, time: "16:00", client: sara, status: "completed" },
    { days: -3, time: "09:00", client: selma, status: "completed" },
    { days: -3, time: "11:00", client: damir, status: "completed" },
    { days: -2, time: "10:00", client: lejla, status: "completed" },
    { days: -1, time: "14:00", client: alen, status: "completed" },
    // Today
    { days: 0, time: "09:00", client: selma, status: "scheduled", title: "Training Session" },
    { days: 0, time: "11:00", client: damir, status: "scheduled", title: "Training Session" },
    { days: 0, time: "15:00", client: sara, status: "scheduled", title: "Training Session" },
    // Upcoming
    { days: 1, time: "08:00", client: lejla, status: "scheduled" },
    { days: 1, time: "14:00", client: alen, status: "scheduled" },
    { days: 2, time: "09:00", client: selma, status: "scheduled" },
    { days: 2, time: "11:00", client: damir, status: "scheduled" },
    { days: 3, time: "10:00", client: sara, status: "scheduled", type: "assessment", title: "Monthly Assessment" },
    { days: 5, time: "09:00", client: selma, status: "scheduled" },
    { days: 5, time: "14:00", client: alen, status: "scheduled" },
    { days: 7, time: "09:00", client: selma, status: "scheduled" },
    { days: 7, time: "11:00", client: damir, status: "scheduled" },
  ];

  for (const s of sessionData) {
    await prisma.schedule.create({
      data: {
        title: s.title || "Training Session",
        date: addDays(today, s.days),
        startTime: s.time,
        endTime: `${String(parseInt(s.time.split(":")[0]) + 1).padStart(2, "0")}:00`,
        status: s.status,
        type: s.type || "session",
        clientId: s.client.id,
        tenantId: tenant.id,
      },
    });
  }

  // ========== MEASUREMENTS (8 weeks of data for Amina + Damir) ==========
  const selmaMeasurements = [
    { daysAgo: 56, weight: 78.5, bodyFat: 32, waist: 86, hips: 104, chest: 98, arms: 30, thighs: 60 },
    { daysAgo: 49, weight: 77.8, bodyFat: 31.5, waist: 85, hips: 103, chest: 97, arms: 30, thighs: 59 },
    { daysAgo: 42, weight: 77.2, bodyFat: 31, waist: 84, hips: 102, chest: 97, arms: 29.5, thighs: 59 },
    { daysAgo: 35, weight: 76.0, bodyFat: 30, waist: 82, hips: 101, chest: 96, arms: 29, thighs: 58 },
    { daysAgo: 28, weight: 75.5, bodyFat: 29.5, waist: 81, hips: 100, chest: 96, arms: 29, thighs: 58 },
    { daysAgo: 21, weight: 74.8, bodyFat: 29, waist: 80, hips: 99, chest: 95, arms: 28.5, thighs: 57 },
    { daysAgo: 14, weight: 74.2, bodyFat: 28, waist: 79, hips: 98, chest: 95, arms: 28, thighs: 57 },
    { daysAgo: 7, weight: 73.5, bodyFat: 27.5, waist: 78, hips: 97, chest: 94, arms: 28, thighs: 56 },
  ];

  for (const m of selmaMeasurements) {
    await prisma.measurement.create({
      data: { weight: m.weight, bodyFat: m.bodyFat, chest: m.chest, waist: m.waist, hips: m.hips, arms: m.arms, thighs: m.thighs, date: subDays(today, m.daysAgo), clientId: selma.id },
    });
  }

  const damirMeasurements = [
    { daysAgo: 56, weight: 82.0, bodyFat: 18, chest: 102, arms: 36, thighs: 58 },
    { daysAgo: 42, weight: 83.5, bodyFat: 17, chest: 104, arms: 37, thighs: 59 },
    { daysAgo: 28, weight: 84.0, bodyFat: 16.5, chest: 105, arms: 37.5, thighs: 60 },
    { daysAgo: 14, weight: 85.0, bodyFat: 16, chest: 106, arms: 38, thighs: 61 },
  ];

  for (const m of damirMeasurements) {
    await prisma.measurement.create({
      data: { weight: m.weight, bodyFat: m.bodyFat, chest: m.chest, arms: m.arms, thighs: m.thighs, date: subDays(today, m.daysAgo), clientId: damir.id },
    });
  }

  // ========== MESSAGES ==========
  const coachId = coach.id;
  // Messages require a user sender - use coach + the client users we created
  const selmaUser = clientUsers[0]; // selma
  const damirUser = clientUsers[1]; // damir
  const lejlaUser = clientUsers[2]; // lejla
  const alenUser = clientUsers[3]; // alen

  const msgData = [
    { clientId: selma.id, senderId: coachId, content: "Zdravo Selma! Welcome to FitPro. I've assigned your first workout plan — Full Body Circuit. Let's aim for 3 sessions this week.", daysAgo: 10 },
    { clientId: selma.id, senderId: selmaUser.id, content: "Hvala coach! I checked the workout plan and it looks great. Quick question — can I substitute burpees with something lower impact? My knees have been bothering me.", daysAgo: 10 },
    { clientId: selma.id, senderId: coachId, content: "Of course! Replace burpees with squat-to-press. Same intensity but easier on the knees. Let me know how the first session goes 💪", daysAgo: 9 },
    { clientId: selma.id, senderId: selmaUser.id, content: "First workout done! It was tough but I feel great. The kettlebell swings were my favorite.", daysAgo: 8 },
    { clientId: selma.id, senderId: coachId, content: "Amazing work! Your form looked great in today's session. Keep it up and remember to drink plenty of water.", daysAgo: 7 },
    { clientId: selma.id, senderId: selmaUser.id, content: "Down 1kg this week! The habit tracking is really helping me stay on top of my water intake.", daysAgo: 3 },
    { clientId: selma.id, senderId: coachId, content: "That's fantastic progress! Consistency is key. See you tomorrow at 9am.", daysAgo: 2 },

    { clientId: damir.id, senderId: coachId, content: "Damir, I've set up your Upper Body and Lower Body split. We're going to add 2.5kg to your bench every week.", daysAgo: 12 },
    { clientId: damir.id, senderId: damirUser.id, content: "Sounds like a plan! I hit 75kg on bench today for 4x8. Felt solid.", daysAgo: 11 },
    { clientId: damir.id, senderId: coachId, content: "Great work. For next session let's try 77.5kg. Focus on the eccentric — 3 seconds down. I added video links to each exercise, check them out.", daysAgo: 10 },
    { clientId: damir.id, senderId: damirUser.id, content: "The videos are super helpful! Realized my row form was off. Thanks for adding those.", daysAgo: 9 },
    { clientId: damir.id, senderId: damirUser.id, content: "Just did legs. Those Bulgarian split squats are brutal 😂 but I can feel them working.", daysAgo: 5 },
    { clientId: damir.id, senderId: coachId, content: "Haha they're the best exercise nobody wants to do! Your squat depth is improving a lot. Keep pushing.", daysAgo: 5 },

    { clientId: lejla.id, senderId: coachId, content: "Lejla, your Runner's Strength plan is ready. These exercises will complement your running and prevent injuries.", daysAgo: 8 },
    { clientId: lejla.id, senderId: lejlaUser.id, content: "Thank you! I did my first strength session yesterday. Feeling muscles I didn't know I had!", daysAgo: 7 },
    { clientId: lejla.id, senderId: coachId, content: "That's normal! The single leg work will really help your running stability. How was your long run this weekend?", daysAgo: 6 },
    { clientId: lejla.id, senderId: lejlaUser.id, content: "18km at a 5:30 pace. Felt much more stable in my hips, I think the hip thrusts are helping already.", daysAgo: 5 },

    { clientId: alen.id, senderId: coachId, content: "Alen, I've created a Core & Posture Rehab plan for you. These are gentle exercises — don't push through any pain.", daysAgo: 9 },
    { clientId: alen.id, senderId: alenUser.id, content: "Thanks coach. I've been doing the dead bugs and bird dogs daily. My back already feels a bit better in the mornings.", daysAgo: 6 },
    { clientId: alen.id, senderId: coachId, content: "Great to hear! In 2 weeks we'll start adding some light resistance. The pallof press is key — it teaches your core to resist rotation which protects your back.", daysAgo: 5 },
  ];

  for (const m of msgData) {
    await prisma.message.create({
      data: {
        content: m.content,
        senderId: m.senderId,
        clientId: m.clientId,
        tenantId: tenant.id,
        createdAt: subDays(new Date(), m.daysAgo),
        isRead: m.daysAgo > 1,
      },
    });
  }

  // ========== CHECK-IN TEMPLATES ==========
  const weeklyCheckIn = await prisma.checkInTemplate.create({
    data: {
      name: "Weekly Check-In",
      frequency: "weekly",
      tenantId: tenant.id,
      questions: [
        { id: "q1", question: "How are you feeling this week overall?", type: "text" },
        { id: "q2", question: "Rate your energy level (1-10)", type: "rating" },
        { id: "q3", question: "How was your nutrition this week?", type: "text" },
        { id: "q4", question: "Any aches, pains, or injuries to report?", type: "text" },
        { id: "q5", question: "How many workouts did you complete?", type: "number" },
        { id: "q6", question: "Anything else you want to share?", type: "text" },
      ],
    },
  });

  // Amina's check-ins
  await prisma.checkIn.create({
    data: {
      templateId: weeklyCheckIn.id,
      clientId: selma.id,
      submittedAt: subDays(new Date(), 7),
      coachNotes: "Great progress Selma! Your consistency is really showing. Let's add an extra set to the goblet squats next week.",
      answers: [
        { questionId: "q1", answer: "Feeling really motivated! The weight is coming off slowly but I can see changes in how my clothes fit." },
        { questionId: "q2", answer: "7" },
        { questionId: "q3", answer: "Pretty good, stuck to the meal plan 5 out of 7 days. Weekend was harder." },
        { questionId: "q4", answer: "Slight soreness in my quads from Tuesday but it's gone now." },
        { questionId: "q5", answer: "3" },
        { questionId: "q6", answer: "Can we start doing more core work? I want to strengthen my midsection." },
      ],
    },
  });

  await prisma.checkIn.create({
    data: {
      templateId: weeklyCheckIn.id,
      clientId: selma.id,
      submittedAt: subDays(new Date(), 1),
      answers: [
        { questionId: "q1", answer: "Best week yet! Hit all my workouts and stayed on track with eating." },
        { questionId: "q2", answer: "8" },
        { questionId: "q3", answer: "Nailed it this week! Meal prepped on Sunday and it made a huge difference." },
        { questionId: "q4", answer: "Nothing to report, feeling great." },
        { questionId: "q5", answer: "3" },
        { questionId: "q6", answer: "I'm down 5kg total now! Thank you for everything coach!" },
      ],
    },
  });

  await prisma.checkIn.create({
    data: {
      templateId: weeklyCheckIn.id,
      clientId: damir.id,
      submittedAt: subDays(new Date(), 3),
      coachNotes: "Solid week Damir. The strength gains are real — let's test your bench max next week.",
      answers: [
        { questionId: "q1", answer: "Feeling strong. The progressive overload is working, adding weight every session." },
        { questionId: "q2", answer: "9" },
        { questionId: "q3", answer: "Eating a lot. Around 3200 calories per day. Lots of chicken and rice." },
        { questionId: "q4", answer: "Left shoulder feels a bit tight during overhead press." },
        { questionId: "q5", answer: "4" },
        { questionId: "q6", answer: "Hit 80kg on bench for 3 reps! Getting closer to the 100kg goal." },
      ],
    },
  });

  // ========== HABITS ==========
  const habitData = [
    { name: "Drink 2L water", icon: "💧" },
    { name: "8 hours sleep", icon: "😴" },
    { name: "10,000 steps", icon: "🚶" },
    { name: "Eat 5 servings vegetables", icon: "🥦" },
    { name: "Take supplements", icon: "💊" },
    { name: "Stretch 10 minutes", icon: "🧘" },
    { name: "No processed sugar", icon: "🚫" },
    { name: "Track all meals", icon: "📝" },
  ];

  const habits = [];
  for (const h of habitData) {
    const habit = await prisma.habitTemplate.create({
      data: { ...h, tenantId: tenant.id },
    });
    habits.push(habit);
  }

  // Assign habits to clients
  const habitAssignments = [
    { client: selma, habits: [0, 1, 2, 3, 6, 7] }, // water, sleep, steps, veggies, no sugar, track meals
    { client: damir, habits: [0, 1, 4, 7] }, // water, sleep, supplements, track meals
    { client: lejla, habits: [0, 1, 2, 5] }, // water, sleep, steps, stretch
    { client: alen, habits: [0, 1, 5] }, // water, sleep, stretch
  ];

  for (const assignment of habitAssignments) {
    for (const habitIdx of assignment.habits) {
      const clientHabit = await prisma.clientHabit.create({
        data: {
          clientId: assignment.client.id,
          habitId: habits[habitIdx].id,
        },
      });

      // Generate habit logs for the last 14 days (varying completion rates)
      for (let d = 0; d < 14; d++) {
        // Different completion rates per client
        const completionChance =
          assignment.client.id === selma.id ? 0.85 :
          assignment.client.id === damir.id ? 0.9 :
          assignment.client.id === lejla.id ? 0.75 : 0.7;

        if (Math.random() < completionChance) {
          await prisma.habitLog.create({
            data: {
              clientHabitId: clientHabit.id,
              date: subDays(today, d),
              completed: true,
            },
          });
        }
      }
    }
  }

  // ========== WORKOUT LOGS (Damir's recent bench progress) ==========
  const upperExercises = await prisma.exercise.findMany({
    where: { workoutPlanId: upperBody.id },
    orderBy: { orderIndex: "asc" },
  });

  const benchPress = upperExercises[0];
  const bentRow = upperExercises[1];

  // Damir logged 3 workouts
  for (let w = 0; w < 3; w++) {
    const benchWeight = 70 + w * 2.5;
    const log = await prisma.workoutLog.create({
      data: {
        clientId: damir.id,
        workoutPlanId: upperBody.id,
        completed: true,
        duration: 55 + Math.floor(Math.random() * 15),
        date: subDays(today, 14 - w * 5),
        notes: w === 2 ? "Felt really strong today. PR on bench!" : undefined,
      },
    });

    // Bench press entries
    for (let s = 1; s <= 4; s++) {
      await prisma.workoutLogEntry.create({
        data: {
          workoutLogId: log.id,
          exerciseId: benchPress.id,
          setNumber: s,
          repsCompleted: s <= 2 ? 10 : 8,
          weightUsed: `${benchWeight}kg`,
          completed: true,
        },
      });
    }

    // Row entries
    for (let s = 1; s <= 4; s++) {
      await prisma.workoutLogEntry.create({
        data: {
          workoutLogId: log.id,
          exerciseId: bentRow.id,
          setNumber: s,
          repsCompleted: 10,
          weightUsed: `${50 + w * 2.5}kg`,
          completed: true,
        },
      });
    }
  }

  // ========== NOTIFICATIONS ==========
  await prisma.notification.createMany({
    data: [
      { type: "check_in_submitted", title: "Check-in submitted", body: "Selma Mehić submitted a weekly check-in", userId: coach.id, tenantId: tenant.id, isRead: false, createdAt: subDays(new Date(), 1) },
      { type: "new_message", title: "New message", body: "Selma: Down 1kg this week! The habit tracking is really helping.", userId: coach.id, tenantId: tenant.id, isRead: false, createdAt: subDays(new Date(), 3) },
      { type: "session_reminder", title: "Session tomorrow", body: "You have a session with Selma Mehić at 9:00 AM", userId: coach.id, tenantId: tenant.id, isRead: true, createdAt: subDays(new Date(), 1) },
      { type: "new_message", title: "New message from coach", body: "Emir: That's fantastic progress! See you tomorrow.", userId: selmaUser.id, tenantId: tenant.id, isRead: false, createdAt: subDays(new Date(), 2) },
      { type: "workout_assigned", title: "New workout plan", body: "Your coach assigned you: Full Body Circuit", userId: selmaUser.id, tenantId: tenant.id, isRead: true, createdAt: subDays(new Date(), 10) },
      { type: "habit_reminder", title: "Daily habits", body: "Don't forget to check off your daily habits!", userId: selmaUser.id, tenantId: tenant.id, isRead: true, createdAt: subDays(new Date(), 1) },
    ],
  });

  // ========== GROUP TRAINING ==========

  const morningHiit = await prisma.trainingGroup.create({
    data: {
      name: "Morning HIIT",
      description: "High-intensity interval training — Monday/Wednesday/Friday at 7 AM",
      maxParticipants: 12,
      tenantId: tenant.id,
    },
  });

  const strengthClub = await prisma.trainingGroup.create({
    data: {
      name: "Strength Club",
      description: "Barbell focused strength training for intermediate lifters",
      maxParticipants: 8,
      tenantId: tenant.id,
    },
  });

  // Add members to groups
  for (const client of [selma, damir, lejla]) {
    await prisma.trainingGroupMember.create({
      data: { groupId: morningHiit.id, clientId: client.id },
    });
  }
  for (const client of [damir, alen, sara]) {
    await prisma.trainingGroupMember.create({
      data: { groupId: strengthClub.id, clientId: client.id },
    });
  }

  // Group sessions
  const hiitSession = await prisma.groupSession.create({
    data: {
      title: "Morning HIIT - Monday",
      date: addDays(today, 1),
      startTime: "07:00",
      endTime: "08:00",
      location: "Main gym floor",
      status: "scheduled",
      maxParticipants: 12,
      isOpen: false,
      groupId: morningHiit.id,
      tenantId: tenant.id,
    },
  });

  // Auto-enroll group members
  for (const client of [selma, damir, lejla]) {
    await prisma.groupSessionParticipant.create({
      data: { sessionId: hiitSession.id, clientId: client.id, status: "enrolled" },
    });
  }

  // Open session (standalone, any client can join)
  const openSession = await prisma.groupSession.create({
    data: {
      title: "Saturday Outdoor Bootcamp",
      date: addDays(today, 5),
      startTime: "09:00",
      endTime: "10:30",
      location: "City park",
      status: "scheduled",
      maxParticipants: 20,
      isOpen: true,
      tenantId: tenant.id,
    },
  });

  // A completed session (past)
  await prisma.groupSession.create({
    data: {
      title: "Strength Club - Wednesday",
      date: subDays(today, 2),
      startTime: "18:00",
      endTime: "19:30",
      location: "Weight room",
      status: "completed",
      maxParticipants: 8,
      groupId: strengthClub.id,
      tenantId: tenant.id,
      participants: {
        create: [
          { clientId: damir.id, status: "attended" },
          { clientId: alen.id, status: "attended" },
          { clientId: sara.id, status: "no-show" },
        ],
      },
    },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("┌──────────────────────────────────────────────────────────┐");
  console.log("│  COACH LOGIN                                            │");
  console.log("│  Email: coach@demo.com                                  │");
  console.log("│  Password: password123                                  │");
  console.log("│                                                         │");
  console.log("│  CLIENT LOGINS (all use password: password123)           │");
  console.log("│  • selma@example.com  (Selma Mehić)                    │");
  console.log("│  • damir@example.com  (Damir Mehmedović)                │");
  console.log("│  • lejla@example.com  (Lejla Bašić)                     │");
  console.log("│  • alen@example.com   (Alen Hodžić)                     │");
  console.log("│                                                         │");
  console.log("│  Sara & Mirza don't have portal access yet              │");
  console.log("│  (coach can invite them from client detail page)         │");
  console.log("└──────────────────────────────────────────────────────────┘");
  console.log("\nRun: npm run dev");
  console.log("Then open: http://localhost:3000\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
