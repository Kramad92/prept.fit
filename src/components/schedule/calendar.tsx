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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="card">
      {/* Calendar Header */}
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-gray-100"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day Labels */}
      <div className="grid grid-cols-7 text-center">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-2 text-xs font-semibold uppercase text-gray-500"
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

          return (
            <button
              key={i}
              onClick={() => onDateSelect(d)}
              className={cn(
                "relative flex min-h-[4rem] flex-col items-start border-t border-gray-100 p-1.5 text-left transition-colors md:min-h-[5rem] md:p-2",
                !inMonth && "bg-gray-50 text-gray-300",
                inMonth && "hover:bg-gray-50",
                selected && "bg-brand-50"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                  today && "bg-brand-600 font-bold text-white",
                  selected && !today && "bg-brand-100 font-semibold text-brand-700"
                )}
              >
                {format(d, "d")}
              </span>
              {/* Event dots (mobile) / labels (desktop) */}
              <div className="mt-1 w-full space-y-0.5">
                {dayEvents.slice(0, 2).map((evt) => (
                  <div
                    key={evt.id}
                    className={cn(
                      "hidden truncate rounded px-1 py-0.5 text-xs md:block",
                      evt.status === "cancelled"
                        ? "bg-red-50 text-red-600 line-through"
                        : "bg-brand-50 text-brand-700"
                    )}
                  >
                    {evt.startTime} {evt.clientName || evt.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="hidden text-xs text-gray-400 md:block">
                    +{dayEvents.length - 2} more
                  </div>
                )}
                {/* Mobile: just dots */}
                {dayEvents.length > 0 && (
                  <div className="flex justify-center gap-0.5 md:hidden">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          evt.status === "cancelled"
                            ? "bg-red-400"
                            : "bg-brand-500"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
