import { Dumbbell, Mail, Phone, Globe, Award, Star, ArrowRight } from "lucide-react";
import type { CoachPublicProfile } from "@/types";
import { SocialLinks } from "./public/social-links";
import { LandingPageInteractive } from "./public/landing-page-interactive";
import Image from "next/image";

export function CoachLandingPage({ profile }: { profile: CoachPublicProfile }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {profile.logo ? (
              <Image src={profile.logo} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <Dumbbell className="h-7 w-7 text-brand-600" />
            )}
            <span className="text-xl font-bold">{profile.name}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {profile.bio && <a href="#about" className="text-gray-600 transition-colors hover:text-gray-900">About</a>}
            {profile.certificates.length > 0 && <a href="#certificates" className="text-gray-600 transition-colors hover:text-gray-900">Credentials</a>}
            {profile.packages.length > 0 && <a href="#pricing" className="text-gray-600 transition-colors hover:text-gray-900">Pricing</a>}
            <a href="#contact" className="rounded-lg bg-brand-600 px-4 py-2 text-white transition-colors hover:bg-brand-700">
              Get in Touch
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28">
        {/* Subtle background */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-brand-500/5 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-500/3 blur-[100px]" />
        </div>

        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-10 md:flex-row">
          {profile.coachPhoto && (
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-brand-400/20 to-brand-600/10 blur-lg" />
              <Image
                src={profile.coachPhoto}
                alt={profile.name}
                width={280}
                height={280}
                className="relative h-52 w-52 rounded-2xl object-cover shadow-xl ring-1 ring-black/5 md:h-64 md:w-64"
              />
            </div>
          )}
          <div className={profile.coachPhoto ? "" : "text-center mx-auto"}>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              {profile.name}
            </h1>
            {profile.bio && (
              <p className="mt-4 text-lg leading-relaxed text-gray-500 line-clamp-3">
                {profile.bio}
              </p>
            )}
            {/* Specialties */}
            {profile.specialties && profile.specialties.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {profile.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 ring-1 ring-brand-200/50"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-brand-600/40"
              >
                Book a Consultation
                <ArrowRight className="h-4 w-4" />
              </a>
              {profile.packages.length > 0 && (
                <a
                  href="#pricing"
                  className="inline-flex items-center rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  View Packages
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      {profile.bio && (
        <section id="about" className="border-t border-gray-100 bg-gray-50/80 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">About</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">About Me</h2>
            <p className="mt-4 whitespace-pre-line text-gray-600 leading-relaxed">
              {profile.bio}
            </p>

            {/* Contact Info */}
            <div className="mt-6 flex flex-wrap gap-4">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-brand-600">
                  <Mail className="h-4 w-4" /> {profile.email}
                </a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-brand-600">
                  <Phone className="h-4 w-4" /> {profile.phone}
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200 transition-colors hover:text-brand-600">
                  <Globe className="h-4 w-4" /> {profile.website}
                </a>
              )}
            </div>

            {profile.socialLinks && (
              <div className="mt-4">
                <SocialLinks links={profile.socialLinks} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Certificates */}
      {profile.certificates.length > 0 && (
        <section id="certificates" className="border-t border-gray-100 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Credentials</p>
            <h2 className="mt-2 text-2xl font-bold text-gray-900">Credentials & Certificates</h2>
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {profile.certificates.map((cert) => (
                <div key={cert.id} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:shadow-lg hover:-translate-y-0.5">
                  {cert.imageUrl && (
                    <div className="overflow-hidden">
                      <Image
                        src={cert.imageUrl}
                        alt={cert.name}
                        width={300}
                        height={200}
                        className="h-36 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Award className="h-4 w-4 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                        {cert.issuer && (
                          <p className="text-sm text-gray-500">{cert.issuer}</p>
                        )}
                        {cert.year && (
                          <p className="text-sm text-gray-400">{cert.year}</p>
                        )}
                        {cert.description && (
                          <p className="mt-1 text-sm text-gray-600">{cert.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing / Packages */}
      {profile.packages.length > 0 && (
        <section id="pricing" className="border-t border-gray-100 bg-gray-50/80 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-600">Pricing</p>
            <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
              Packages & Pricing
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {profile.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative overflow-hidden rounded-2xl border bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                    pkg.isFeatured
                      ? "border-brand-500 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10"
                      : "border-gray-200"
                  }`}
                >
                  {pkg.isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-brand-600/25">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-gray-900">
                      {pkg.currency === "BAM" ? "KM" : pkg.currency} {pkg.price}
                    </span>
                    {pkg.duration && (
                      <span className="text-sm text-gray-500"> / {pkg.duration}</span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="mt-3 text-sm text-gray-600">{pkg.description}</p>
                  )}
                  {pkg.features && pkg.features.length > 0 && (
                    <ul className="mt-5 space-y-2.5">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                          <svg className="h-4 w-4 flex-shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href="#contact"
                    className={`mt-6 block w-full rounded-xl py-2.5 text-center text-sm font-semibold transition-all ${
                      pkg.isFeatured
                        ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Get Started
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Interactive sections (availability + inquiry form) */}
      <LandingPageInteractive slug={profile.slug} />

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="mx-auto max-w-4xl text-center">
          {profile.socialLinks && (
            <div className="mb-4 flex justify-center">
              <SocialLinks links={profile.socialLinks} />
            </div>
          )}
          <p className="text-sm text-gray-400">
            {profile.name} &mdash; Powered by Prept
          </p>
        </div>
      </footer>
    </div>
  );
}
