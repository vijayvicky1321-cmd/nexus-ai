"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthGrid } from "@/components/calendar/month-grid";
import { EventDialog } from "@/components/calendar/event-dialog";
import { apiFetch } from "@/lib/api-client";
import type { CalendarEvent } from "@/components/calendar/types";

export default function CalendarPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [month, setMonth] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const loadEvents = useCallback(async () => {
    const from = startOfWeek(startOfMonth(month)).toISOString();
    const to = endOfWeek(endOfMonth(month)).toISOString();
    const token = await getToken();
    const res = await apiFetch(
      `/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      token
    );
    if (!res.ok) return;
    setEvents(await res.json());
  }, [getToken, month]);

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, organization?.id]);

  function openCreate(day: Date) {
    setActiveEvent(null);
    setDefaultDate(day);
    setDialogOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setActiveEvent(event);
    setDefaultDate(null);
    setDialogOpen(true);
  }

  async function handleSave(values: {
    title: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
  }) {
    const token = await getToken();
    const body = {
      title: values.title,
      description: values.description || null,
      starts_at: values.starts_at,
      ends_at: values.ends_at,
    };
    const res = activeEvent
      ? await apiFetch(`/calendar/events/${activeEvent.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/calendar/events", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
    if (!res.ok) return;
    setDialogOpen(false);
    await loadEvents();
  }

  async function handleDelete() {
    if (!activeEvent) return;
    const token = await getToken();
    const res = await apiFetch(`/calendar/events/${activeEvent.id}`, token, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setDialogOpen(false);
    await loadEvents();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setMonth((m) => subMonths(m, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="w-40 text-center text-lg font-semibold">{format(month, "MMMM yyyy")}</h1>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setMonth(new Date())}>
            Today
          </Button>
        </div>
        <Button
          onClick={() => openCreate(new Date())}
          className="gap-1.5 rounded-full bg-orange-500 px-5 text-white hover:bg-orange-500/90"
        >
          <Plus className="size-4" />
          Add event
        </Button>
      </div>

      <MonthGrid month={month} events={events} onDayClick={openCreate} onEventClick={openEdit} />

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={activeEvent}
        defaultDate={defaultDate}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
