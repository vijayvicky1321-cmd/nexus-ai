"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Paperclip, Mic, ArrowUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "e.g. Research the pros and cons of X and summarize findings",
  "e.g. Summarize this document into 5 key bullet points",
  "e.g. Write a Python script to parse a CSV and plot trends",
  "e.g. Plan a step-by-step workflow for onboarding a customer",
  "e.g. Explain what this code does and how to improve it",
];

const MAX_CHARS = 4000;

export function PromptInput({
  goal,
  onGoalChange,
  onRun,
  submitting,
}: {
  goal: string;
  onGoalChange: (v: string) => void;
  onRun: () => void;
  submitting: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (goal) return;
    const id = setInterval(() => setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, [goal]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [goal]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onRun();
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
      }}
      className={cn(
        "relative flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-sm transition-colors",
        dragOver ? "border-dashed border-primary bg-primary/5" : "border-border"
      )}
    >
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-2xl bg-card/90 text-sm font-medium text-primary">
          <Upload className="size-4" />
          Drop file to attach
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={goal}
        onChange={(e) => onGoalChange(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDERS[placeholderIdx]}
        rows={3}
        maxLength={MAX_CHARS}
        className="w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
      />

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            title="Attach file (coming soon)"
            className="text-muted-foreground"
          >
            <Paperclip className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled
            title="Voice input (coming soon)"
            className="text-muted-foreground"
          >
            <Mic className="size-4" />
          </Button>
          <span className="ml-1 hidden text-[11px] text-muted-foreground sm:inline">
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">⌘/Ctrl</kbd>
            {" + "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-sans">Enter</kbd>
            {" to run"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {goal.length}/{MAX_CHARS}
          </span>
          <motion.div whileHover={{ scale: submitting || !goal.trim() ? 1 : 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={onRun}
              disabled={submitting || !goal.trim()}
              size="icon-sm"
              className="size-8 rounded-xl"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
