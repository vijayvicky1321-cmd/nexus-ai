"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import type { ImageChatMessage } from "./types";

export function ImageMessageThread({
  messages,
  previewUrl,
}: {
  messages: ImageChatMessage[];
  previewUrl?: string;
}) {
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
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected image"
            className="mx-auto max-h-80 rounded-xl border border-border/70 object-contain"
          />
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10">
              <ImageIcon className="size-5 text-cyan-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select an image and ask a question about it.
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
                  : "w-full max-w-none text-foreground prose prose-sm dark:prose-invert prose-headings:mt-3 prose-headings:mb-1.5"
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content || "…"}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
