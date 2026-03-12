import { Metadata } from "next";
import { getTenantFromHost } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { HomePage } from "@/components/home-page";
import { CoachLandingPage } from "@/components/coach-landing-page";
import type { CoachPublicProfile } from "@/types";

async function getCoachProfile(): Promise<CoachPublicProfile | null> {
  const tenant = await getTenantFromHost();
  if (!tenant || !tenant.landingPageEnabled) return null;

  const data = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    select: {
      name: true,
      slug: true,
      logo: true,
      bio: true,
      phone: true,
      email: true,
      website: true,
      coachPhoto: true,
      socialLinks: true,
      specialties: true,
      certificates: { orderBy: { orderIndex: "asc" } },
      packages: { where: { isActive: true }, orderBy: { orderIndex: "asc" } },
    },
  });

  if (!data) return null;

  return {
    ...data,
    socialLinks: data.socialLinks as Record<string, string> | null,
    specialties: data.specialties as string[] | null,
    certificates: data.certificates.map((c) => ({
      id: c.id,
      name: c.name,
      issuer: c.issuer,
      year: c.year,
      description: c.description,
      imageUrl: c.imageUrl,
      orderIndex: c.orderIndex,
    })),
    packages: data.packages.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency,
      duration: p.duration,
      features: p.features as string[] | null,
      isActive: p.isActive,
      isFeatured: p.isFeatured,
      orderIndex: p.orderIndex,
    })),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getCoachProfile();
  if (!profile) {
    return {
      title: "Prept — Your personal training business, simplified",
      description: "Manage clients, schedule sessions, build workout plans, and track progress — all in one place.",
    };
  }

  return {
    title: `${profile.name} — Personal Training`,
    description: profile.bio || `${profile.name} — Personal training services`,
    openGraph: {
      title: `${profile.name} — Personal Training`,
      description: profile.bio || `${profile.name} — Personal training services`,
      images: profile.coachPhoto ? [profile.coachPhoto] : undefined,
    },
  };
}

export default async function RootPage() {
  const profile = await getCoachProfile();

  if (profile) {
    return <CoachLandingPage profile={profile} />;
  }

  return <HomePage />;
}
