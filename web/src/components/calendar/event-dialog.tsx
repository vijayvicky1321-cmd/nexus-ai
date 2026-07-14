"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarEvent } from "./types";

function splitIso(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return { date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm") };
}

function combine(date: string, time: string): string | null {
  if (!date) return null;
  const t = time || "00:00";
  return new Date(`${date}T${t}`).toISOString();
}

export function EventDialog({
  open,
  onOpenChange,
  event,
  defaultDate,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  defaultDate: Date | null;
  onSave: (values: {
    title: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      const start = splitIso(event.starts_at);
      const end = splitIso(event.ends_at);
      setStartDate(start.date);
      setStartTime(start.time);
      setEndDate(end.date);
      setEndTime(end.time);
    } else {
      const base = defaultDate ?? new Date();
      setTitle("");
      setDescription("");
      setStartDate(format(base, "yyyy-MM-dd"));
      setStartTime("09:00");
      setEndDate("");
      setEndTime("");
    }
  }, [open, event, defaultDate]);

  async function handleSave() {
    const starts_at = combine(startDate, startTime);
    if (!title.trim() || !starts_at) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        starts_at,
        ends_at: combine(endDate, endTime),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[70px] w-full resize-y rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Start date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Start time</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">End date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">End time</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          {event && (
            <Button
              variant="outline"
              onClick={onDelete}
              className="rounded-full text-destructive hover:text-destructive sm:mr-auto"
            >
              Delete
            </Button>
          )}
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full bg-orange-500 text-white hover:bg-orange-500/90"
            onClick={handleSave}
            disabled={saving || !title.trim() || !startDate}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
