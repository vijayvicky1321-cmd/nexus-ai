"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineStep = {
  step: string;
  result: string;
  done: boolean;
};

export function ProgressTimeline({
  planning,
  steps,
  summarizing,
  completed,
}: {
  planning: boolean;
  steps: TimelineStep[];
  summarizing: boolean;
  completed: boolean;
}) {
  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const pct = total === 0 ? (planning ? 0 : 0) : Math.round((doneCount / total) * 100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {planning ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          )}
          Planning
        </span>
        <span className="h-px flex-1 bg-border" />
        <span>
          {doneCount}/{total || "?"} steps
        </span>
        <span className="h-px flex-1 bg-border" />
        <span className="flex items-center gap-1.5">
          {completed ? (
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          ) : (
            <Circle className="size-3.5" />
          )}
          Completed
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${completed ? 100 : pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {planning && total === 0 && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="size-4 shrink-0 animate-pulse rounded-full bg-muted" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div
                  className="h-3 animate-pulse rounded bg-muted"
                  style={{ width: `${60 - i * 10}%` }}
                />
                <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted/70" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-3"
          >
            <div className="pt-0.5">
              {s.done ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : s.result ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <p className={cn("text-sm font-medium", s.done && "text-foreground")}>
                Step {i + 1}. {s.step}
              </p>
              {s.result && (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{s.result}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {summarizing && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" /> Generating summary...
        </p>
      )}
    </div>
  );
}
