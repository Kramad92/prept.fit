import { notFound } from "next/navigation";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CoachLandingPage } from "@/components/coach-landing-page";
import type { CoachPublicProfile } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getCoachBySlug(slug: string): Promise<CoachPublicProfile | null> {
  const data = await prisma.tenant.findUnique({
    where: { slug },
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
      landingPageEnabled: true,
      certificates: { orderBy: { orderIndex: "asc" } },
      packages: { where: { isActive: true }, orderBy: { orderIndex: "asc" } },
    },
  });

  if (!data || !data.landingPageEnabled) return null;

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getCoachBySlug(slug);

  if (!profile) {
    return { title: "Coach not found" };
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

export default async function CoachPage({ params }: Props) {
  const { slug } = await params;
  const profile = await getCoachBySlug(slug);

  if (!profile) {
    notFound();
  }

  return <CoachLandingPage profile={profile} />;
}
