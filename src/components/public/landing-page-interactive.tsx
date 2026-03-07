"use client";

import { AvailabilityViewer, useAvailabilitySlots } from "./availability-viewer";
import { InquiryForm } from "./inquiry-form";

export function LandingPageInteractive({ slug }: { slug: string }) {
  const slots = useAvailabilitySlots(slug);

  return (
    <>
      {/* Availability Section */}
      <section id="availability" className="py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="text-2xl font-bold text-gray-900">Availability</h2>
          <p className="mt-1 text-sm text-gray-500">Available slots in the next 2 weeks</p>
          <div className="mt-6">
            <AvailabilityViewer slug={slug} />
          </div>
        </div>
      </section>

      {/* Inquiry Form Section */}
      <section id="contact" className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
          <p className="mt-1 text-sm text-gray-500">
            Send me a message and I&apos;ll get back to you as soon as possible
          </p>
          <div className="mt-6">
            <InquiryForm slug={slug} slots={slots} />
          </div>
        </div>
      </section>
    </>
  );
}
