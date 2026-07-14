"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NotebookPen } from "lucide-react";
import { NoteList } from "@/components/notes/note-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import type { Note, NoteAIAction } from "@/components/notes/types";

const AI_ACTIONS: { action: NoteAIAction; label: string }[] = [
  { action: "summarize", label: "Summarize" },
  { action: "improve", label: "Improve writing" },
  { action: "expand", label: "Expand" },
];

export default function NotesPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [aiAction, setAiAction] = useState<NoteAIAction | null>(null);
  const [aiPreview, setAiPreview] = useState("");

  const loadNotes = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/notes", token);
    if (!res.ok) return;
    setNotes(await res.json());
  }, [getToken]);

  const loadNote = useCallback(
    async (noteId: string) => {
      const token = await getToken();
      const res = await apiFetch(`/notes/${noteId}`, token);
      if (!res.ok) return;
      const note: Note = await res.json();
      setTitle(note.title);
      setContent(note.content);
      setDirty(false);
      setAiPreview("");
      setAiAction(null);
    },
    [getToken]
  );

  useEffect(() => {
    setActiveId(null);
    setTitle("");
    setContent("");
    setAiPreview("");
    setAiAction(null);
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    if (activeId) loadNote(activeId);
  }, [activeId, loadNote]);

  async function handleCreate() {
    const token = await getToken();
    const res = await apiFetch("/notes", token, { method: "POST" });
    if (!res.ok) return;
    const note: Note = await res.json();
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setDirty(false);
    setAiPreview("");
    setAiAction(null);
  }

  async function handleSave() {
    if (!activeId) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await apiFetch(`/notes/${activeId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) return;
      const note: Note = await res.json();
      setNotes((prev) =>
        [note, ...prev.filter((n) => n.id !== note.id)].sort(
          (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
        )
      );
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!activeId) return;
    const token = await getToken();
    const res = await apiFetch(`/notes/${activeId}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setNotes((prev) => prev.filter((n) => n.id !== activeId));
    setActiveId(null);
    setTitle("");
    setContent("");
    setDeleteOpen(false);
  }

  async function handleAiAction(action: NoteAIAction) {
    if (!activeId) return;
    setAiAction(action);
    setAiPreview("");
    const token = await getToken();
    const res = await apiFetch(`/notes/${activeId}/ai-action`, token, {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    await readSSEStream(res, (delta) => {
      setAiPreview((prev) => prev + delta);
    });
  }

  async function handleAccept() {
    if (!activeId) return;
    setContent(aiPreview);
    const token = await getToken();
    const res = await apiFetch(`/notes/${activeId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ content: aiPreview }),
    });
    if (res.ok) {
      const note: Note = await res.json();
      setNotes((prev) =>
        [note, ...prev.filter((n) => n.id !== note.id)].sort(
          (a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
        )
      );
    }
    setAiAction(null);
    setAiPreview("");
    setDirty(false);
  }

  function handleDiscard() {
    setAiAction(null);
    setAiPreview("");
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <NoteList notes={notes} activeId={activeId} onSelect={setActiveId} onCreate={handleCreate} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-yellow-500/10">
              <NotebookPen className="size-5 text-yellow-500" />
            </div>
            <p className="text-sm text-muted-foreground">Select a note or create a new one.</p>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
              placeholder="Untitled note"
              className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/60"
            />

            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setDirty(true);
              }}
              placeholder="Write your note in Markdown…"
              className="min-h-[300px] w-full resize-y rounded-xl border border-border/70 bg-card p-3.5 font-mono text-sm outline-none focus-visible:border-ring"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={handleSave} disabled={saving || !dirty} className="rounded-full px-5">
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="rounded-full px-5 text-destructive hover:text-destructive"
              >
                Delete
              </Button>
              <div className="ml-auto flex gap-2">
                {AI_ACTIONS.map(({ action, label }) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    disabled={aiAction !== null}
                    onClick={() => handleAiAction(action)}
                    className="rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {aiAction && (
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                  AI preview — {aiAction}
                </span>
                <div className="max-w-none text-sm leading-relaxed text-foreground prose prose-sm dark:prose-invert prose-headings:mt-3 prose-headings:mb-1.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiPreview || "…"}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAccept} disabled={!aiPreview} className="rounded-full">
                    Accept
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDiscard} className="rounded-full">
                    Discard
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note?</DialogTitle>
            <DialogDescription>
              This permanently deletes &ldquo;{title || "Untitled note"}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
