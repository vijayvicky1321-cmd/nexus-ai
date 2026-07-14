"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { DraftList } from "@/components/email-assistant/draft-list";
import { Button } from "@/components/ui/button";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { EmailDraft, EmailMode, EmailTone } from "@/components/email-assistant/types";

const TONES: { value: EmailTone; label: string }[] = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "formal", label: "Formal" },
];

function splitSubjectBody(text: string): { subject: string; body: string } {
  const match = text.match(/^Subject:\s*(.*)\r?\n\r?\n?([\s\S]*)$/);
  if (!match) return { subject: "", body: text };
  return { subject: match[1].trim(), body: match[2].replace(/^\r?\n/, "") };
}

export default function EmailAssistantPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<EmailMode>("reply");
  const [tone, setTone] = useState<EmailTone>("professional");
  const [inputContext, setInputContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [readOnlyDraft, setReadOnlyDraft] = useState<EmailDraft | null>(null);

  const loadDrafts = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/email/drafts", token);
    if (!res.ok) return;
    setDrafts(await res.json());
  }, [getToken]);

  useEffect(() => {
    setActiveId(null);
    setReadOnlyDraft(null);
    setStreamed("");
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  function handleNew() {
    setActiveId(null);
    setReadOnlyDraft(null);
    setStreamed("");
    setInputContext("");
  }

  function handleSelectDraft(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setActiveId(id);
    setReadOnlyDraft(draft);
    setStreamed("");
  }

  async function handleGenerate() {
    if (!inputContext.trim()) return;
    setGenerating(true);
    setStreamed("");
    setReadOnlyDraft(null);
    setActiveId(null);
    try {
      const token = await getToken();
      const res = await apiFetch("/email/generate", token, {
        method: "POST",
        body: JSON.stringify({ mode, input_context: inputContext, tone }),
      });
      await readSSEStream(res, (delta) => {
        setStreamed((prev) => prev + delta);
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveDraft() {
    if (!streamed) return;
    setSaving(true);
    try {
      const { subject, body } = splitSubjectBody(streamed);
      const token = await getToken();
      const res = await apiFetch("/email/drafts", token, {
        method: "POST",
        body: JSON.stringify({
          mode,
          input_context: inputContext,
          tone,
          generated_subject: subject,
          generated_body: body,
        }),
      });
      if (!res.ok) return;
      const draft: EmailDraft = await res.json();
      setDrafts((prev) => [draft, ...prev]);
      setActiveId(draft.id);
      setReadOnlyDraft(draft);
      setStreamed("");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function handleDeleteDraft(id: string) {
    const token = await getToken();
    const res = await apiFetch(`/email/drafts/${id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setReadOnlyDraft(null);
    }
  }

  const previewText = readOnlyDraft
    ? `Subject: ${readOnlyDraft.generated_subject || ""}\n\n${readOnlyDraft.generated_body || ""}`
    : streamed;

  return (
    <div className="flex flex-1 overflow-hidden">
      <DraftList drafts={drafts} activeId={activeId} onSelect={handleSelectDraft} onNew={handleNew} />
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <h1 className="text-lg font-semibold">Email Assistant</h1>

          {!readOnlyDraft && (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("reply")}
                  className={cn(
                    "rounded-full",
                    mode === "reply" && "bg-sky-500 text-white hover:bg-sky-500/90 hover:text-white"
                  )}
                >
                  Reply
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode("compose")}
                  className={cn(
                    "rounded-full",
                    mode === "compose" && "bg-sky-500 text-white hover:bg-sky-500/90 hover:text-white"
                  )}
                >
                  Compose new
                </Button>
              </div>

              <label className="text-sm font-medium text-muted-foreground">
                {mode === "reply" ? "Paste the email you're replying to" : "Describe what you want to say"}
              </label>
              <textarea
                value={inputContext}
                onChange={(e) => setInputContext(e.target.value)}
                placeholder={
                  mode === "reply"
                    ? "Paste the original email here…"
                    : "e.g. Ask my manager for two days off next week…"
                }
                className="min-h-[160px] w-full resize-y rounded-xl border border-border/70 bg-card p-3.5 text-sm outline-none focus-visible:border-ring"
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Tone:</span>
                {TONES.map((t) => (
                  <Button
                    key={t.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "rounded-full",
                      tone === t.value && "bg-sky-500 text-white hover:bg-sky-500/90 hover:text-white"
                    )}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>

              <div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !inputContext.trim()}
                  className="rounded-full bg-sky-500 px-5 text-white hover:bg-sky-500/90"
                >
                  {generating ? "Generating…" : "Generate"}
                </Button>
              </div>
            </>
          )}

          {(streamed || readOnlyDraft) && (
            <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                {readOnlyDraft ? "Saved draft" : "Preview"}
              </span>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {previewText || "…"}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleCopy(previewText)}>
                  Copy
                </Button>
                {readOnlyDraft ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full text-destructive hover:text-destructive"
                    onClick={() => handleDeleteDraft(readOnlyDraft.id)}
                  >
                    Delete
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full bg-sky-500 text-white hover:bg-sky-500/90"
                    onClick={handleSaveDraft}
                    disabled={saving || !streamed}
                  >
                    {saving ? "Saving…" : "Save draft"}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
