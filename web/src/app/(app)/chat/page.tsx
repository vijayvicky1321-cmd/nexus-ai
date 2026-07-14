"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageThread } from "@/components/chat/message-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import type { ChatMessage, Conversation } from "@/components/chat/types";

export default function ChatPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);

  const loadConversations = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/chat/conversations", token);
    if (!res.ok) return;
    const data: Conversation[] = await res.json();
    setConversations(data);
    if (!activeId && data.length > 0) setActiveId(data[0].id);
  }, [getToken, activeId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const token = await getToken();
      const res = await apiFetch(`/chat/conversations/${conversationId}/messages`, token);
      if (!res.ok) return;
      setMessages(await res.json());
    },
    [getToken]
  );

  useEffect(() => {
    setActiveId(null);
    setMessages([]);
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  async function handleCreate() {
    const token = await getToken();
    const res = await apiFetch("/chat/conversations", token, { method: "POST" });
    if (!res.ok) return;
    const conv: Conversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setMessages([]);
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    const res = await apiFetch(`/chat/conversations/${id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function handleSend(text: string) {
    let conversationId = activeId;
    const token = await getToken();

    if (!conversationId) {
      const res = await apiFetch("/chat/conversations", token, { method: "POST" });
      if (!res.ok) return;
      const conv: Conversation = await res.json();
      conversationId = conv.id;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await apiFetch("/chat/messages", token, {
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
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <MessageThread messages={messages} />
        <MessageComposer onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
