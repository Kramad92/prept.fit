import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the demo tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!tenant) {
    console.error("Demo tenant not found. Run `npm run db:seed` first.");
    process.exit(1);
  }

  console.log(`Seeding landing page data for "${tenant.name}" (${tenant.id})...`);

  // Update tenant with landing page fields
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      landingPageEnabled: true,
      coachPhoto: null, // no actual file, but the page still works
      specialties: [
        "Strength Training",
        "Weight Loss",
        "HIIT",
        "Sports Performance",
        "Nutrition Coaching",
        "Bodybuilding",
      ],
      socialLinks: {
        instagram: "https://instagram.com/fitpro.sarajevo",
        facebook: "https://facebook.com/fitprosarajevo",
        youtube: "https://youtube.com/@fitpro",
        tiktok: "",
        twitter: "",
        linkedin: "",
      },
    },
  });

  // Clean existing landing page data
  await prisma.inquiry.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.package.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.certificate.deleteMany({ where: { tenantId: tenant.id } });

  // Seed certificates
  await prisma.certificate.createMany({
    data: [
      {
        name: "Certified Personal Trainer (CPT)",
        issuer: "National Academy of Sports Medicine (NASM)",
        year: 2019,
        description: "Comprehensive certification covering exercise science, program design, and client assessment.",
        orderIndex: 0,
        tenantId: tenant.id,
      },
      {
        name: "Precision Nutrition Level 1",
        issuer: "Precision Nutrition",
        year: 2020,
        description: "Evidence-based nutrition coaching certification for fitness professionals.",
        orderIndex: 1,
        tenantId: tenant.id,
      },
      {
        name: "Kettlebell Instructor",
        issuer: "StrongFirst (SFG)",
        year: 2021,
        description: "Advanced kettlebell training and programming techniques.",
        orderIndex: 2,
        tenantId: tenant.id,
      },
      {
        name: "First Aid & CPR/AED",
        issuer: "Red Cross",
        year: 2024,
        description: "Current first aid and emergency response certification.",
        orderIndex: 3,
        tenantId: tenant.id,
      },
    ],
  });

  // Seed packages
  await prisma.package.createMany({
    data: [
      {
        name: "Starter",
        description: "Perfect for beginners looking to build a solid foundation.",
        price: 150,
        currency: "BAM",
        duration: "monthly",
        features: [
          "3 sessions per week",
          "Custom workout plan",
          "Monthly progress check-in",
          "WhatsApp support",
        ],
        isActive: true,
        isFeatured: false,
        orderIndex: 0,
        tenantId: tenant.id,
      },
      {
        name: "Pro",
        description: "Our most popular plan for serious results. Includes nutrition coaching.",
        price: 250,
        currency: "BAM",
        duration: "monthly",
        features: [
          "5 sessions per week",
          "Custom workout + meal plan",
          "Weekly progress check-ins",
          "Nutrition guidance",
          "Priority WhatsApp support",
          "Progress photo tracking",
        ],
        isActive: true,
        isFeatured: true,
        orderIndex: 1,
        tenantId: tenant.id,
      },
      {
        name: "Elite",
        description: "Full-service coaching for athletes and dedicated individuals.",
        price: 400,
        currency: "BAM",
        duration: "monthly",
        features: [
          "Unlimited sessions",
          "Fully custom workout + nutrition plan",
          "Daily check-ins",
          "Supplement guidance",
          "24/7 coach access",
          "Body composition analysis",
          "Competition prep (optional)",
        ],
        isActive: true,
        isFeatured: false,
        orderIndex: 2,
        tenantId: tenant.id,
      },
    ],
  });

  // Seed sample inquiries
  await prisma.inquiry.createMany({
    data: [
      {
        name: "Amina Hadžić",
        email: "amina.h@email.com",
        phone: "+387 62 555 111",
        message: "Hi! I'm interested in the Pro package. I've been training on my own for about 6 months but feel like I've hit a plateau. Can we schedule a consultation?",
        preferredSlot: "2026-03-10 09:00-10:00",
        status: "new",
        tenantId: tenant.id,
      },
      {
        name: "Kenan Begović",
        email: "kenan.b@email.com",
        phone: "+387 61 222 333",
        message: "I'm looking for help with weight loss. I'm about 15kg overweight and want to get in shape before summer. What would you recommend?",
        status: "contacted",
        tenantId: tenant.id,
      },
      {
        name: "Sara Kovačević",
        email: "sara.k@email.com",
        message: "Do you offer online coaching? I'm based in Mostar and can't make it to Sarajevo regularly.",
        status: "archived",
        tenantId: tenant.id,
      },
    ],
  });

  console.log("Done! Landing page data seeded:");
  console.log("  - Tenant updated with specialties + social links + landingPageEnabled=true");
  console.log("  - 4 certificates");
  console.log("  - 3 packages (Starter, Pro, Elite)");
  console.log("  - 3 sample inquiries");
  console.log("\nVisit http://localhost:3000 to see the landing page.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
