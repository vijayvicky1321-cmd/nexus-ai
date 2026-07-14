"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { DocumentList } from "@/components/pdf-chat/document-list";
import { PdfMessageThread } from "@/components/pdf-chat/pdf-message-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import type { PdfChatMessage, PdfDocument } from "@/components/pdf-chat/types";

export default function PdfChatPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PdfChatMessage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const loadDocuments = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/pdf/documents", token);
    if (!res.ok) return;
    setDocuments(await res.json());
  }, [getToken]);

  useEffect(() => {
    setActiveId(null);
    setMessages([]);
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    const hasPending = documents.some(
      (d) => d.status !== "ready" && d.status !== "error"
    );
    if (!hasPending) return;
    const interval = setInterval(loadDocuments, 2000);
    return () => clearInterval(interval);
  }, [documents, loadDocuments]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const token = await getToken();

      const signRes = await apiFetch("/pdf/upload-url", token, {
        method: "POST",
        body: JSON.stringify({ filename: file.name }),
      });
      if (!signRes.ok) return;
      const { document_id, upload_url } = await signRes.json();

      await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });

      apiFetch(`/pdf/documents/${document_id}/ingest`, token, { method: "POST" });

      await loadDocuments();
      setActiveId(document_id);
      setMessages([]);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    const res = await apiFetch(`/pdf/documents/${id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function handleAsk(question: string) {
    if (!activeId) return;
    const token = await getToken();

    const userMsg: PdfChatMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const assistantMsg: PdfChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await apiFetch(`/pdf/documents/${activeId}/query`, token, {
        method: "POST",
        body: JSON.stringify({ question }),
      });

      const citations = res.headers.get("X-Citations");
      if (citations) {
        try {
          const parsed = JSON.parse(citations);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, citations: parsed } : m))
          );
        } catch {
          // backend may omit citations header; not fatal
        }
      }

      await readSSEStream(res, (delta) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m))
        );
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <DocumentList
        documents={documents}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setMessages([]);
        }}
        onUpload={handleUpload}
        uploading={uploading}
        onDelete={handleDelete}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <PdfMessageThread messages={messages} />
        <MessageComposer
          onSend={handleAsk}
          disabled={streaming || !activeId}
        />
      </div>
    </div>
  );
}
