"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Clock, X } from "lucide-react";
import { Calendar, CalendarEvent } from "@/components/schedule/calendar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/skeleton";

interface ClientOption {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/schedules").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([evts, cls]) => {
        setEvents(evts);
        setClients(cls);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = events.filter((e) => e.date.startsWith(selectedDateStr));

  if (loading) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your training sessions
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">New Session</span>
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Calendar
            events={events}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Day Detail Panel */}
        <div className="card self-start">
          <h3 className="text-sm font-semibold text-gray-900">
            {format(selectedDate, "EEEE, MMMM d")}
          </h3>

          {dayEvents.length === 0 ? (
            <div className="mt-4 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                No sessions on this day.
              </p>
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-primary mt-3 w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Session
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {dayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{evt.title}</span>
                    <StatusBadge status={evt.status} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                  </p>
                  {evt.clientName && (
                    <p className="mt-1 text-xs text-gray-500">
                      {evt.clientName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 md:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Session</h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = {
                  title: formData.get("title"),
                  date: formData.get("date"),
                  startTime: formData.get("startTime"),
                  endTime: formData.get("endTime"),
                  clientId: formData.get("clientId"),
                  type: formData.get("type"),
                  notes: formData.get("notes"),
                };

                await fetch("/api/schedules", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(data),
                });

                setShowNewForm(false);
                const updated = await fetch("/api/schedules").then((r) => r.json());
                setEvents(updated);
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  className="input mt-1"
                  placeholder="Training Session"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={selectedDateStr}
                  className="input mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    required
                    defaultValue="09:00"
                    className="input mt-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Time *
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    required
                    defaultValue="10:00"
                    className="input mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Client *
                </label>
                <select name="clientId" required className="input mt-1">
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select name="type" className="input mt-1">
                  <option value="session">Training Session</option>
                  <option value="assessment">Assessment</option>
                  <option value="consultation">Consultation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="input mt-1"
                  placeholder="Session notes..."
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                Create Session
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
