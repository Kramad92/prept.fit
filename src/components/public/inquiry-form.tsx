"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

export function InquiryForm({ slug, slots }: { slug: string; slots: Slot[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name"),
      email: fd.get("email"),
      phone: fd.get("phone") || undefined,
      message: fd.get("message"),
      preferredSlot: fd.get("preferredSlot") || undefined,
      _hp: fd.get("_hp"),
    };

    try {
      const res = await fetch(`/api/public/${slug}/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError("Failed to send. Please try again.");
      }
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-brand-50 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <Send className="h-5 w-5 text-brand-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Message Sent!</h3>
        <p className="mt-1 text-sm text-gray-600">
          Thank you for your inquiry. We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot - hidden from real users */}
      <input type="text" name="_hp" className="hidden" tabIndex={-1} autoComplete="off" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Phone</label>
        <input
          type="tel"
          name="phone"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {slots.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Preferred Time Slot
          </label>
          <select
            name="preferredSlot"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">Select a slot...</option>
            {slots.slice(0, 20).map((slot) => (
              <option
                key={`${slot.date}_${slot.startTime}`}
                value={`${slot.date} ${slot.startTime}-${slot.endTime}`}
              >
                {slot.date} — {slot.startTime} to {slot.endTime}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Message *</label>
        <textarea
          name="message"
          required
          rows={4}
          placeholder="Tell me about your goals..."
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        <Send className="mr-2 h-4 w-4" />
        {submitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
