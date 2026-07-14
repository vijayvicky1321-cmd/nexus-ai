"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, MessageSquare, X } from "lucide-react";
import type { Conversation } from "./types";

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border/70">
      <div className="p-2.5">
        <Button onClick={onCreate} className="w-full justify-start gap-2" variant="outline">
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">No conversations yet.</p>
        )}
        {conversations.map((c) => {
          const active = activeId === c.id;
          return (
            <div
              key={c.id}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-lg text-left text-sm transition-colors hover:bg-accent/60",
                active ? "bg-accent text-accent-foreground" : "text-foreground/90"
              )}
            >
              {active && (
                <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                <MessageSquare className="size-4 shrink-0 text-blue-500" />
                <span className="truncate">{c.title || "Untitled conversation"}</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                aria-label="Close conversation"
                className="mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
