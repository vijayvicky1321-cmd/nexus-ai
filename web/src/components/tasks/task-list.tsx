"use client";

import { useState } from "react";
import { format, isPast, isToday } from "date-fns";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "./types";

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const overdue =
    !task.is_done && !!task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date));

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 transition-colors hover:bg-accent/30">
      <Checkbox checked={task.is_done} onCheckedChange={() => onToggle(task)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm", task.is_done && "text-muted-foreground line-through")}>
          {task.title}
        </span>
        {task.due_date && (
          <span className={cn("text-xs text-muted-foreground", overdue && "font-medium text-destructive")}>
            {format(new Date(task.due_date), "MMM d, yyyy")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button variant="ghost" size="icon-sm" aria-label="Edit task" onClick={() => onEdit(task)}>
          <Pencil className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Delete task" onClick={() => onDelete(task)}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [showCompleted, setShowCompleted] = useState(false);
  const open = tasks.filter((t) => !t.is_done);
  const completed = tasks.filter((t) => t.is_done);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {open.length === 0 && (
          <p className="px-1 text-sm text-muted-foreground">No open tasks. Add one above.</p>
        )}
        {open.map((task) => (
          <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>

      {completed.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1 self-start text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showCompleted ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            Show completed ({completed.length})
          </button>
          {showCompleted &&
            completed.map((task) => (
              <TaskRow key={task.id} task={task} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </div>
      )}
    </div>
  );
}
