"use client";

import { useState, useEffect } from "react";
import { CalendarPlus, Check, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

interface GroupedSlots {
  [date: string]: Slot[];
}

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/booking/slots?days=14")
      .then((r) => r.json())
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleBook(slot: Slot) {
    setBooking(true);
    setError("");
    setBooked(null);

    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }),
      });

      if (res.ok) {
        setBooked(`${slot.date}_${slot.startTime}`);
        // Remove the booked slot from available slots
        setSlots((prev) =>
          prev.filter(
            (s) => !(s.date === slot.date && s.startTime === slot.startTime)
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || "Failed to book session");
      }
    } finally {
      setBooking(false);
    }
  }

  // Group slots by date
  const grouped: GroupedSlots = {};
  for (const slot of slots) {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Book a Session</h1>
      <p className="mt-1 text-sm text-gray-500">
        Choose an available time slot to book your next training session
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {booked && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4" />
          Session booked successfully! View it on your home page.
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="card mt-8 flex flex-col items-center py-10 text-center">
          <Clock className="h-12 w-12 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">
            No available time slots in the next 2 weeks.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Your coach may not have set their availability yet. Check back
            later.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {Object.entries(grouped).map(([date, daySlots]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-700">
                {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {daySlots.map((slot) => {
                  const key = `${slot.date}_${slot.startTime}`;
                  const isBooked = booked === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleBook(slot)}
                      disabled={booking || isBooked}
                      className={`rounded-lg border p-3 text-center transition-all ${
                        isBooked
                          ? "border-green-300 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50"
                      } disabled:cursor-not-allowed`}
                    >
                      {isBooked ? (
                        <div className="flex items-center justify-center gap-1">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-medium">Booked</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            {formatTime(slot.startTime)}
                          </p>
                          <p className="text-xs text-gray-400">
                            to {formatTime(slot.endTime)}
                          </p>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
