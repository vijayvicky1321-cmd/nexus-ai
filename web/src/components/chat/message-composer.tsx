"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { SendHorizontal } from "lucide-react";

export function MessageComposer({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border/70 p-4">
      <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2 focus-within:border-ring">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autoResize(e.target);
          }}
          onKeyDown={onKeyDown}
          placeholder="Send a message…"
          disabled={disabled}
          rows={1}
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          onClick={submit}
          disabled={disabled || !value.trim()}
          size="icon"
          className="mb-0.5 shrink-0 rounded-full"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
