"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar, CalendarEvent } from "@/components/schedule/calendar";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatTime } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";

interface ClientOption {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const t = useT();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [formClientId, setFormClientId] = useState("");
  const [formType, setFormType] = useState("session");

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

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.schedule.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t.schedule.subtitle}
          </p>
        </div>
        <Button
          onClick={() => setShowNewForm(true)}
        >
          <Plus className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline">{t.schedule.newSession}</span>
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                {t.schedule.noSessionsOnDay}
              </p>
              <Button
                onClick={() => setShowNewForm(true)}
                className="mt-3 w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t.schedule.addSession}
              </Button>
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
      <Dialog open={showNewForm} onOpenChange={(open) => { if (!open) { setFormClientId(""); setFormType("session"); } setShowNewForm(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.schedule.newSession}</DialogTitle>
          </DialogHeader>

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
                clientId: formClientId,
                type: formType,
                notes: formData.get("notes"),
              };

              await fetch("/api/schedules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });

              setShowNewForm(false);
              setFormClientId("");
              setFormType("session");
              const updated = await fetch("/api/schedules").then((r) => r.json());
              setEvents(updated);
            }}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.schedule.sessionTitle} *
              </label>
              <Input
                type="text"
                name="title"
                required
                className="mt-1"
                placeholder={t.schedule.titlePlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.common.date} *
              </label>
              <Input
                type="date"
                name="date"
                required
                defaultValue={selectedDateStr}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.schedule.startTime} *
                </label>
                <Input
                  type="time"
                  name="startTime"
                  required
                  defaultValue="09:00"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t.schedule.endTime} *
                </label>
                <Input
                  type="time"
                  name="endTime"
                  required
                  defaultValue="10:00"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.schedule.client} *
              </label>
              <FilterSelect
                value={formClientId}
                onChange={setFormClientId}
                placeholder={t.schedule.selectClient}
                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.schedule.type}
              </label>
              <FilterSelect
                value={formType}
                onChange={setFormType}
                placeholder={t.schedule.type}
                options={[
                  { value: "session", label: t.schedule.trainingSession },
                  { value: "assessment", label: t.schedule.assessment },
                  { value: "consultation", label: t.schedule.consultation },
                ]}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t.common.notes}
              </label>
              <Textarea
                name="notes"
                rows={2}
                className="mt-1"
                placeholder={t.schedule.sessionNotes}
              />
            </div>
            <Button type="submit" className="w-full">
              {t.schedule.createSession}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
