"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

export function AvailabilityViewer({ slug }: { slug: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/${slug}/availability?days=14`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSlots(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500">
        No available slots at the moment. Please reach out via the contact form below.
      </p>
    );
  }

  // Group slots by date
  const grouped: Record<string, Slot[]> = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  }

  const dates = Object.keys(grouped).slice(0, 7);

  return (
    <div className="space-y-4">
      {dates.map((date) => (
        <div key={date}>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {grouped[date].map((slot) => (
              <span
                key={`${slot.date}_${slot.startTime}`}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
              >
                <Clock className="h-3 w-3" />
                {slot.startTime} – {slot.endTime}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Export a hook version that provides slots to InquiryForm
export function useAvailabilitySlots(slug: string) {
  const [slots, setSlots] = useState<Slot[]>([]);

  useEffect(() => {
    fetch(`/api/public/${slug}/availability?days=14`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSlots(data);
      })
      .catch(() => {});
  }, [slug]);

  return slots;
}
