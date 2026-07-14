"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Download, Share2, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ResultsPanel({
  goal,
  summary,
  onRegenerate,
  regenerating,
}: {
  goal: string;
  summary: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    const blob = new Blob([`# ${goal}\n\n${summary}\n`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-run-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={handleCopy} title="Copy" aria-label={copied ? "Copied" : "Copy summary"}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleDownload} title="Download as Markdown" aria-label="Download as Markdown">
            <Download className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" disabled title="Share (coming soon)" aria-label="Share (coming soon)">
            <Share2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRegenerate}
            disabled={regenerating}
            title="Regenerate"
            aria-label="Regenerate summary"
          >
            <RotateCcw className={cn("size-3.5", regenerating && "animate-spin")} />
          </Button>
          <span className="mx-1 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setFeedback((f) => (f === "up" ? null : "up"))}
            title="Like"
            aria-label={feedback === "up" ? "Remove like" : "Like this summary"}
            aria-pressed={feedback === "up"}
            className={cn(feedback === "up" && "text-emerald-500")}
          >
            <ThumbsUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setFeedback((f) => (f === "down" ? null : "down"))}
            title="Dislike"
            aria-label={feedback === "down" ? "Remove dislike" : "Dislike this summary"}
            aria-pressed={feedback === "down"}
            className={cn(feedback === "down" && "text-red-500")}
          >
            <ThumbsDown className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
