"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";

export function MessageThread({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Sparkles className="size-5 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground">Ask anything to start the conversation.</p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}
          >
            <span className="px-1 text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
              {m.role === "user" ? "You" : "Assistant"}
            </span>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm whitespace-pre-wrap text-primary-foreground">
                {m.content}
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert w-full max-w-none text-foreground prose-headings:mt-3 prose-headings:mb-1.5 prose-pre:bg-muted">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
