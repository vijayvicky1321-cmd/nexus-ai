"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Bot } from "lucide-react";
import type { AgentRunSummary } from "./types";

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

const STATUS_STYLES: Record<string, string> = {
  planning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  running: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

export function RunList({
  runs,
  activeId,
  onSelect,
  onCreate,
}: {
  runs: AgentRunSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/70">
      <div className="p-2.5">
        <Button onClick={onCreate} className="w-full justify-start gap-2">
          <Plus className="size-4" />
          New run
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {runs.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">No runs yet.</p>
        )}
        {runs.map((r) => {
          const active = activeId === r.id;
          return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={cn(
              "relative flex w-full flex-col gap-1 rounded-xl px-2.5 py-2.5 text-left text-sm transition-colors hover:bg-accent/60",
              active && "bg-accent"
            )}
          >
            {active && (
              <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />
            )}
            <span className="flex items-center gap-2 truncate">
              <Bot className="size-4 shrink-0 text-primary" />
              <span className="truncate">{r.goal || "Untitled run"}</span>
            </span>
            <span className="flex items-center gap-2 pl-6 text-xs text-muted-foreground">
              <StatusBadge status={r.status} />
              {relativeTime(r.created_at)}
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}
