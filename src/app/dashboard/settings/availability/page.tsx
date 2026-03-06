"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react";
import { formatTime } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  isActive: boolean;
}

export default function AvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const t = useT();

  const DAYS = [
    t.availability.sunday,
    t.availability.monday,
    t.availability.tuesday,
    t.availability.wednesday,
    t.availability.thursday,
    t.availability.friday,
    t.availability.saturday,
  ];

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => r.json())
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function addSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      dayOfWeek: parseInt(formData.get("dayOfWeek") as string),
      startTime: formData.get("startTime") as string,
      endTime: formData.get("endTime") as string,
      slotMinutes: parseInt(formData.get("slotMinutes") as string) || 60,
    };

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const slot = await res.json();
        setSlots((prev) =>
          [...prev, slot].sort(
            (a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)
          )
        );
        e.currentTarget.reset();
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeSlot(id: string) {
    await fetch(`/api/availability?id=${id}`, { method: "DELETE" });
    setSlots((prev) => prev.filter((s) => s.id !== id));
  }

  // Group by day
  const byDay: Record<number, AvailabilitySlot[]> = {};
  for (const slot of slots) {
    if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = [];
    byDay[slot.dayOfWeek].push(slot);
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
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.availability.backToSettings}
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">{t.availability.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        {t.availability.subtitle}
      </p>

      {/* Add Slot Form */}
      <form onSubmit={addSlot} className="card mt-6 max-w-lg">
        <h3 className="text-sm font-semibold text-gray-700">
          {t.availability.addSlot}
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <label className="text-xs text-gray-500">{t.common.date}</label>
            <select name="dayOfWeek" className="input mt-0.5" required>
              {DAYS.map((day, i) => (
                <option key={i} value={i}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.schedule.startTime}</label>
            <input
              type="time"
              name="startTime"
              defaultValue="09:00"
              className="input mt-0.5"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.schedule.endTime}</label>
            <input
              type="time"
              name="endTime"
              defaultValue="17:00"
              className="input mt-0.5"
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">{t.availability.slotLength}</label>
            <select name="slotMinutes" className="input mt-0.5">
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60" selected>
                60 min
              </option>
              <option value="90">90 min</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary mt-3 w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          {saving ? t.availability.adding : t.availability.addSlot}
        </button>
      </form>

      {/* Current Availability */}
      <div className="mt-8 space-y-4">
        {slots.length === 0 ? (
          <div className="card flex flex-col items-center py-8 text-center">
            <Clock className="h-10 w-10 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {t.availability.noSlotsYet}
            </p>
          </div>
        ) : (
          DAYS.map((day, i) => {
            const daySlots = byDay[i];
            if (!daySlots || daySlots.length === 0) return null;

            return (
              <div key={i} className="card">
                <h3 className="text-sm font-semibold text-gray-900">{day}</h3>
                <div className="mt-2 space-y-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>
                          {formatTime(slot.startTime)} -{" "}
                          {formatTime(slot.endTime)}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({slot.slotMinutes} {t.availability.minSlots})
                        </span>
                      </div>
                      <button
                        onClick={() => removeSlot(slot.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
