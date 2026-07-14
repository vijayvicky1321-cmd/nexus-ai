"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import type { PdfChatMessage } from "./types";

export function PdfMessageThread({ messages }: { messages: PdfChatMessage[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    scrollToBottom();
    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div ref={contentRef} className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-500/10">
              <FileText className="size-5 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select a document and ask a question about it.
            </p>
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
            <div
              className={cn(
                "max-w-[90%] text-sm leading-relaxed",
                m.role === "user"
                  ? "whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground"
                  : "w-full max-w-none text-foreground prose prose-sm dark:prose-invert prose-headings:mt-3 prose-headings:mb-1.5 prose-table:text-xs"
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
            {m.citations && m.citations.length > 0 && (
              <div className="flex max-w-[90%] flex-col gap-1.5">
                {m.citations.map((c) => (
                  <div
                    key={c.chunk_index}
                    className="rounded-lg border border-border/70 bg-card px-3 py-2 text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">Chunk {c.chunk_index}: </span>
                    {c.chunk_text}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
