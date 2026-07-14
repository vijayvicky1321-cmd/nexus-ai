"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { ConversationList } from "@/components/coding-assistant/conversation-list";
import { CodeFileList } from "@/components/coding-assistant/code-file-list";
import { CodeMessageThread } from "@/components/coding-assistant/code-message-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import type { CodeChatMessage, CodeConversation, CodeFile } from "@/components/coding-assistant/types";

export default function CodingAssistantPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [conversations, setConversations] = useState<CodeConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CodeChatMessage[]>([]);
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const skipNextLoadRef = useRef(false);

  const loadConversations = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/coding/conversations", token);
    if (!res.ok) return;
    const data: CodeConversation[] = await res.json();
    setConversations(data);
  }, [getToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const token = await getToken();
      const res = await apiFetch(`/coding/conversations/${conversationId}/messages`, token);
      if (!res.ok) return;
      setMessages(await res.json());
    },
    [getToken]
  );

  const loadFiles = useCallback(
    async (conversationId: string) => {
      const token = await getToken();
      const res = await apiFetch(`/coding/conversations/${conversationId}/files`, token);
      if (!res.ok) return;
      setFiles(await res.json());
    },
    [getToken]
  );

  useEffect(() => {
    setActiveId(null);
    setMessages([]);
    setFiles([]);
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    if (streaming) return;
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    if (activeId) {
      loadMessages(activeId);
      loadFiles(activeId);
    } else {
      setMessages([]);
      setFiles([]);
    }
  }, [activeId, loadMessages, loadFiles, streaming]);

  useEffect(() => {
    const hasPending = files.some((f) => f.status === "uploading");
    if (!hasPending || !activeId) return;
    const interval = setInterval(() => loadFiles(activeId), 1500);
    return () => clearInterval(interval);
  }, [files, activeId, loadFiles]);

  async function handleCreate() {
    const token = await getToken();
    const res = await apiFetch("/coding/conversations", token, { method: "POST" });
    if (!res.ok) return;
    const conv: CodeConversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
    setFiles([]);
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    const res = await apiFetch(`/coding/conversations/${id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
      setFiles([]);
    }
  }

  async function ensureConversation(): Promise<string | null> {
    if (activeId) return activeId;
    const token = await getToken();
    const res = await apiFetch("/coding/conversations", token, { method: "POST" });
    if (!res.ok) return null;
    const conv: CodeConversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    skipNextLoadRef.current = true;
    setActiveId(conv.id);
    return conv.id;
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const conversationId = await ensureConversation();
      if (!conversationId) return;
      const token = await getToken();

      const signRes = await apiFetch(
        `/coding/conversations/${conversationId}/files/upload-url`,
        token,
        { method: "POST", body: JSON.stringify({ filename: file.name }) }
      );
      if (!signRes.ok) return;
      const { file_id, upload_url } = await signRes.json();

      await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": "text/plain" },
        body: file,
      });

      await apiFetch(
        `/coding/conversations/${conversationId}/files/${file_id}/complete`,
        token,
        { method: "POST" }
      );

      await loadFiles(conversationId);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(text: string) {
    const isNewConversation = !activeId;
    const conversationId = await ensureConversation();
    if (!conversationId) return;
    const token = await getToken();

    const userMsg: CodeChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: CodeChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    // Creating a conversation flips activeId, which triggers the loadMessages
    // effect and would otherwise clobber this in-progress stream with the
    // server's not-yet-updated message list. Seed instead of appending here.
    if (isNewConversation) {
      setMessages([userMsg, assistantMsg]);
    } else {
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
    }
    setStreaming(true);

    try {
      const res = await apiFetch("/coding/messages", token, {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, message: text }),
      });
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
      <div className="flex h-full w-64 flex-col">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
        <CodeFileList files={files} onUpload={handleUpload} uploading={uploading} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <CodeMessageThread messages={messages} />
        <MessageComposer onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
