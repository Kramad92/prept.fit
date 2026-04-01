"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Clock, CalendarDays, Users, ChevronRight } from "lucide-react";
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

  // Upcoming sessions (next 7 days from today)
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const upcomingEvents = events
    .filter((e) => e.date >= todayStr && e.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 5);

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.schedule.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
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

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Today",
            value: events.filter((e) => e.date.startsWith(todayStr) && e.status !== "cancelled").length,
            icon: CalendarDays,
            color: "text-brand-400 bg-brand-500/15",
          },
          {
            label: "This Week",
            value: (() => {
              const now = new Date();
              const weekStart = new Date(now);
              weekStart.setDate(now.getDate() - now.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              const ws = format(weekStart, "yyyy-MM-dd");
              const we = format(weekEnd, "yyyy-MM-dd");
              return events.filter((e) => e.date >= ws && e.date <= we && e.status !== "cancelled").length;
            })(),
            icon: Clock,
            color: "text-blue-400 bg-blue-500/15",
          },
          {
            label: "Upcoming",
            value: upcomingEvents.length,
            icon: ChevronRight,
            color: "text-purple-400 bg-purple-500/15",
          },
          {
            label: "Clients",
            value: clients.length,
            icon: Users,
            color: "text-emerald-400 bg-emerald-500/15",
          },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
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
        <div className="space-y-4 self-start">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <h3 className="font-semibold text-foreground">
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dayEvents.length} session{dayEvents.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="p-4">
              {dayEvents.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t.schedule.noSessionsOnDay}
                  </p>
                  <Button
                    onClick={() => setShowNewForm(true)}
                    variant="outline"
                    className="mt-4"
                    size="sm"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t.schedule.addSession}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="group rounded-lg border border-border bg-muted/50 p-3 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{evt.title}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(evt.startTime)} – {formatTime(evt.endTime)}
                          </div>
                          {evt.clientName && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {evt.clientName}
                            </div>
                          )}
                        </div>
                        <StatusBadge status={evt.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming sessions mini-list */}
          {upcomingEvents.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border bg-muted/50 px-4 py-3">
                <h3 className="font-semibold text-foreground">Upcoming</h3>
              </div>
              <div className="divide-y divide-border">
                {upcomingEvents.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      const d = new Date(evt.date + "T12:00:00");
                      setSelectedDate(d);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
                      <span className="text-xs font-medium leading-none">
                        {format(new Date(evt.date + "T12:00:00"), "MMM")}
                      </span>
                      <span className="text-sm font-bold leading-tight">
                        {format(new Date(evt.date + "T12:00:00"), "d")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {evt.clientName || evt.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(evt.startTime)} – {formatTime(evt.endTime)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
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
              <label className="block text-sm font-medium text-foreground">
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
              <label className="block text-sm font-medium text-foreground">
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
                <label className="block text-sm font-medium text-foreground">
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
                <label className="block text-sm font-medium text-foreground">
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
              <label className="block text-sm font-medium text-foreground">
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
              <label className="block text-sm font-medium text-foreground">
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
              <label className="block text-sm font-medium text-foreground">
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
