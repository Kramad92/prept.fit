import { Dumbbell, Mail, Phone, Globe, Award, Star } from "lucide-react";
import type { CoachPublicProfile } from "@/types";
import { SocialLinks } from "./public/social-links";
import { LandingPageInteractive } from "./public/landing-page-interactive";
import Image from "next/image";

export function CoachLandingPage({ profile }: { profile: CoachPublicProfile }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {profile.logo ? (
              <Image src={profile.logo} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <Dumbbell className="h-7 w-7 text-emerald-600" />
            )}
            <span className="text-xl font-bold">{profile.name}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            {profile.bio && <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>}
            {profile.certificates.length > 0 && <a href="#certificates" className="text-gray-600 hover:text-gray-900">Credentials</a>}
            {profile.packages.length > 0 && <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>}
            <a href="#contact" className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
              Get in Touch
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row">
          {profile.coachPhoto && (
            <div className="flex-shrink-0">
              <Image
                src={profile.coachPhoto}
                alt={profile.name}
                width={240}
                height={240}
                className="h-48 w-48 rounded-2xl object-cover shadow-lg md:h-60 md:w-60"
              />
            </div>
          )}
          <div className={profile.coachPhoto ? "" : "text-center mx-auto"}>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">
              {profile.name}
            </h1>
            {profile.bio && (
              <p className="mt-4 text-lg text-gray-500 line-clamp-3">
                {profile.bio}
              </p>
            )}
            {/* Specialties */}
            {profile.specialties && profile.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.specialties.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#contact"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Book a Consultation
              </a>
              {profile.packages.length > 0 && (
                <a
                  href="#pricing"
                  className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
        <section id="about" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-gray-900">About Me</h2>
            <p className="mt-4 whitespace-pre-line text-gray-600 leading-relaxed">
              {profile.bio}
            </p>

            {/* Contact Info */}
            <div className="mt-6 flex flex-wrap gap-4">
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600">
                  <Mail className="h-4 w-4" /> {profile.email}
                </a>
              )}
              {profile.phone && (
                <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600">
                  <Phone className="h-4 w-4" /> {profile.phone}
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-emerald-600">
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
            <h2 className="text-2xl font-bold text-gray-900">Credentials & Certificates</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profile.certificates.map((cert) => (
                <div key={cert.id} className="rounded-xl border border-gray-200 bg-white p-5">
                  {cert.imageUrl && (
                    <Image
                      src={cert.imageUrl}
                      alt={cert.name}
                      width={300}
                      height={200}
                      className="mb-3 h-32 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="flex items-start gap-3">
                    <Award className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing / Packages */}
      {profile.packages.length > 0 && (
        <section id="pricing" className="border-t border-gray-100 bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Packages & Pricing
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {profile.packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative rounded-xl border bg-white p-6 ${
                    pkg.isFeatured
                      ? "border-emerald-500 ring-2 ring-emerald-500"
                      : "border-gray-200"
                  }`}
                >
                  {pkg.isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                        <Star className="h-3 w-3" /> Featured
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{pkg.name}</h3>
                  <div className="mt-2">
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
                    <ul className="mt-4 space-y-2">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href="#contact"
                    className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${
                      pkg.isFeatured
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50"
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
            {profile.name} &mdash; Powered by TrainerHub
          </p>
        </div>
      </footer>
    </div>
  );
}
