"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Check, Copy, Terminal } from "lucide-react";
import type { CodeChatMessage } from "./types";

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!match) {
    return <code className={className}>{children}</code>;
  }

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border/50">
      <div className="flex items-center justify-between bg-[#1e1e2e] px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-mono">{match[1]}</span>
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 opacity-70 transition-opacity hover:bg-white/10 hover:opacity-100"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        language={match[1]}
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem" }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function CodeMessageThread({ messages }: { messages: CodeChatMessage[] }) {
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
    <div ref={containerRef} className="min-h-0 flex-1 overflow-y-scroll px-6 py-8">
      <div ref={contentRef} className="mx-auto flex max-w-3xl flex-col gap-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Terminal className="size-5 text-emerald-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Ask a coding question, optionally attaching files for grounded context.
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
                  : "w-full max-w-none text-foreground prose prose-sm dark:prose-invert prose-headings:mt-3 prose-headings:mb-1.5 prose-pre:bg-transparent prose-pre:p-0"
              )}
            >
              {m.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      return (
                        <CodeBlock className={className} {...props}>
                          {children}
                        </CodeBlock>
                      );
                    },
                  }}
                >
                  {m.content || "…"}
                </ReactMarkdown>
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
