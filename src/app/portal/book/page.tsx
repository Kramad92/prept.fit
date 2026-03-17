"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Check, Clock, AlertCircle } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useT, useLocale, getDateLocale } from "@/lib/i18n";

interface Slot {
  date: string;
  startTime: string;
  endTime: string;
}

interface GroupedSlots {
  [date: string]: Slot[];
}

export default function BookingPage() {
  const t = useT();
  const { locale } = useLocale();
  const dateLocale = getDateLocale(locale);
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
        setSlots((prev) =>
          prev.filter(
            (s) => !(s.date === slot.date && s.startTime === slot.startTime)
          )
        );
      } else {
        const data = await res.json();
        setError(data.error || t.portalBook.failedToBook);
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

  const totalSlots = slots.length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
        <div className="mt-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.portalBook.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.portalBook.subtitle}
          </p>
        </div>
        {totalSlots > 0 && (
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">
            <CalendarDays className="h-4 w-4" />
            {totalSlots} slot{totalSlots !== 1 ? "s" : ""} available
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {booked && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          {t.portalBook.bookedSuccess}
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-gray-200 bg-white py-16 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <Clock className="h-6 w-6 text-gray-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-gray-700">
            {t.portalBook.noSlotsNextWeeks}
          </p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">
            {t.portalBook.coachNotSetAvailability}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {Object.entries(grouped).map(([date, daySlots]) => {
            const dateObj = new Date(date + "T12:00:00");
            const isToday = new Date().toDateString() === dateObj.toDateString();
            const isTomorrow = (() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              return tomorrow.toDateString() === dateObj.toDateString();
            })();

            return (
              <div key={date}>
                <div className="flex items-center gap-3">
                  {/* Date badge */}
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="text-[10px] font-semibold uppercase leading-none">
                      {dateObj.toLocaleDateString(dateLocale, { month: "short" })}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {dateObj.getDate()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      {isToday
                        ? "Today"
                        : isTomorrow
                          ? "Tomorrow"
                          : dateObj.toLocaleDateString(dateLocale, { weekday: "long" })}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {dateObj.toLocaleDateString(dateLocale, {
                        weekday: isToday || isTomorrow ? "long" : undefined,
                        month: "long",
                        day: "numeric",
                      })}
                      {" · "}
                      {daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {daySlots.map((slot) => {
                    const key = `${slot.date}_${slot.startTime}`;
                    const isBooked = booked === key;

                    return (
                      <button
                        key={key}
                        onClick={() => handleBook(slot)}
                        disabled={booking || isBooked}
                        className={`group relative overflow-hidden rounded-xl border p-3 text-center transition-all ${
                          isBooked
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 bg-white shadow-sm hover:border-brand-300 hover:shadow-md hover:shadow-brand-100/50"
                        } disabled:cursor-not-allowed`}
                      >
                        {isBooked ? (
                          <div className="flex items-center justify-center gap-1.5 text-green-700">
                            <Check className="h-4 w-4" />
                            <span className="text-sm font-semibold">{t.portalBook.bookedLabel}</span>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-brand-700">
                              {formatTime(slot.startTime)}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-400">
                              {t.portalBook.to} {formatTime(slot.endTime)}
                            </p>
                            {/* Hover accent bar */}
                            <div className="absolute bottom-0 left-0 h-0.5 w-full scale-x-0 bg-brand-500 transition-transform group-hover:scale-x-100" />
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
