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
  scheduled: { dot: "bg-blue-500", bg: "bg-blue-50 border-blue-100", text: "text-blue-700" },
  confirmed: { dot: "bg-brand-500", bg: "bg-brand-50 border-brand-100", text: "text-brand-700" },
  completed: { dot: "bg-emerald-500", bg: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
  cancelled: { dot: "bg-red-400", bg: "bg-red-50 border-red-100", text: "text-red-600 line-through" },
  "no-show": { dot: "bg-amber-500", bg: "bg-amber-50 border-amber-100", text: "text-amber-700" },
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-3 md:px-6 md:py-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <p className="text-xs text-gray-500">
            {monthEvents.length} session{monthEvents.length !== 1 ? "s" : ""} this month
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => { setCurrentMonth(new Date()); onDateSelect(new Date()); }}
            className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/30">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-gray-400"
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
                "relative flex min-h-[4.5rem] flex-col items-start border-b border-r border-gray-100 p-1.5 text-left transition-all md:min-h-[5.5rem] md:p-2",
                !inMonth && "bg-gray-50/60 text-gray-300",
                inMonth && isWeekend && "bg-gray-50/30",
                inMonth && !isWeekend && "bg-white",
                inMonth && "hover:bg-brand-50/40",
                selected && "bg-brand-50/60 ring-1 ring-inset ring-brand-200",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm transition-colors",
                  today && "bg-brand-600 font-bold text-white shadow-sm shadow-brand-600/30",
                  selected && !today && "bg-brand-100 font-semibold text-brand-700",
                  !today && !selected && inMonth && "text-gray-700",
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
                      <span className="text-gray-400">{formatTime(evt.startTime)}</span>{" "}
                      {evt.clientName || evt.title}
                    </div>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div className="px-1.5 text-[10px] font-medium text-gray-400">
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
