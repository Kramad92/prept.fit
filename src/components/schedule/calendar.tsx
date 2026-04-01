"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  selectedDate: Date;
}

const statusColors: Record<string, { dot: string; bg: string; text: string }> = {
  scheduled: { dot: "bg-blue-500", bg: "bg-blue-500/10 border-blue-500/20", text: "text-blue-400" },
  confirmed: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
  completed: { dot: "bg-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400" },
  cancelled: { dot: "bg-red-400", bg: "bg-red-500/10 border-red-500/20", text: "text-red-400 line-through" },
  "no-show": { dot: "bg-amber-500", bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400" },
};

function getStatusStyle(status: string) {
  return statusColors[status] || statusColors.scheduled;
}

export function Calendar({ events, onDateSelect, selectedDate }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  function getEventsForDay(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => e.date.startsWith(dateStr));
  }

  // Count total events this month for the header
  const monthEvents = events.filter((e) => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-slate-800/60 shadow-lg shadow-black/20">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 md:px-6 md:py-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <p className="text-xs text-slate-400">
            {monthEvents.length} session{monthEvents.length !== 1 ? "s" : ""} this month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); onDateSelect(new Date()); }}
            className="rounded-lg bg-brand-500/15 px-3 py-1.5 text-sm font-medium text-brand-400 transition-colors hover:bg-brand-500/25"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const dayEvents = getEventsForDay(d);
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSameDay(d, selectedDate);
          const today = isToday(d);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;

          return (
            <button
              key={i}
              onClick={() => onDateSelect(d)}
              className={cn(
                "relative flex min-h-[4.5rem] flex-col items-start border-b border-r border-white/[0.04] p-1.5 text-left transition-all md:min-h-[5.5rem] md:p-2",
                !inMonth && "bg-slate-900/40 text-slate-700",
                inMonth && isWeekend && "bg-white/[0.02]",
                inMonth && !isWeekend && "bg-white/[0.04]",
                inMonth && "hover:bg-white/[0.08]",
                selected && !today && "!bg-brand-500/[0.08] ring-1 ring-inset ring-brand-400/25",
                selected && today && "!bg-brand-500/[0.08]",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors",
                  today && "bg-brand-500 font-bold text-slate-950 shadow-md shadow-brand-500/40",
                  selected && !today && "bg-brand-400/20 font-semibold text-brand-300",
                  !today && !selected && inMonth && "text-slate-300",
                  !inMonth && "text-slate-700",
                )}
              >
                {format(d, "d")}
              </span>

              {/* Desktop: event chips */}
              <div className="mt-0.5 hidden w-full space-y-0.5 md:block">
                {dayEvents.slice(0, 2).map((evt) => {
                  const style = getStatusStyle(evt.status);
                  return (
                    <div
                      key={evt.id}
                      className={cn(
                        "truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight",
                        style.bg,
                        style.text,
                      )}
                    >
                      <span className="text-slate-500">{formatTime(evt.startTime)}</span>{" "}
                      {evt.clientName || evt.title}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="px-1.5 text-[10px] font-medium text-slate-500">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>

              {/* Mobile: colored dots */}
              {dayEvents.length > 0 && (
                <div className="mt-auto flex w-full justify-center gap-0.5 pb-0.5 md:hidden">
                  {dayEvents.slice(0, 4).map((evt) => (
                    <div
                      key={evt.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        getStatusStyle(evt.status).dot,
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
