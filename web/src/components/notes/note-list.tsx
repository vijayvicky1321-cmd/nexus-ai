"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, NotebookPen } from "lucide-react";
import type { Note } from "./types";

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.round(diffMonth / 12)}y ago`;
}

export function NoteList({
  notes,
  activeId,
  onSelect,
  onCreate,
}: {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/70">
      <div className="p-2.5">
        <Button onClick={onCreate} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" />
          New note
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {notes.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">No notes yet.</p>
        )}
        {notes.map((n) => {
          const active = activeId === n.id;
          return (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              className={cn(
                "relative flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent/60",
                active ? "bg-accent text-accent-foreground" : "text-foreground/90"
              )}
            >
              {active && (
                <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <span className="flex items-center gap-2 truncate">
                <NotebookPen className="size-4 shrink-0 text-yellow-500" />
                <span className="truncate">{n.title || "Untitled note"}</span>
              </span>
              <span className="pl-6 text-xs text-muted-foreground">
                {relativeTime(n.updated_at)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
