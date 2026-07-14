"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./types";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

export function MonthGrid({
  month,
  events,
  onDayClick,
  onEventClick,
}: {
  month: Date;
  events: CalendarEvent[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function eventsForDay(day: Date): CalendarEvent[] {
    return events.filter((e) => isSameDay(new Date(e.starts_at), day));
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/70">
      <div className="grid grid-cols-7 border-b border-border/70 bg-muted/40">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const extra = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, month);
          const today = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                "flex min-h-[100px] flex-col gap-1 border-b border-r border-border/70 p-1.5 text-left align-top transition-colors hover:bg-accent/50",
                !inMonth && "bg-muted/20 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  today && "bg-orange-500 text-white"
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((evt) => (
                  <span
                    key={evt.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    className="truncate rounded-md bg-orange-500/10 px-1 py-0.5 text-[11px] text-orange-600 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
                  >
                    {format(new Date(evt.starts_at), "HH:mm")} {evt.title}
                  </span>
                ))}
                {extra > 0 && (
                  <span className="px-1 text-[11px] text-muted-foreground">+{extra} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
