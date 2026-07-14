"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { ImageList } from "@/components/image-understanding/image-list";
import { ImageMessageThread } from "@/components/image-understanding/image-message-thread";
import { MessageComposer } from "@/components/chat/message-composer";
import { apiFetch, readSSEStream } from "@/lib/api-client";
import type { ImageChatMessage, ImageRecord } from "@/components/image-understanding/types";

export default function ImageUnderstandingPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ImageChatMessage[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const loadImages = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/image/images", token);
    if (!res.ok) return;
    setImages(await res.json());
  }, [getToken]);

  useEffect(() => {
    setActiveId(null);
    setMessages([]);
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    const hasPending = images.some((img) => img.status === "uploading");
    if (!hasPending) return;
    const interval = setInterval(loadImages, 2000);
    return () => clearInterval(interval);
  }, [images, loadImages]);

  async function loadMessages(imageId: string) {
    const token = await getToken();
    const res = await apiFetch(`/image/images/${imageId}/messages`, token);
    if (!res.ok) return;
    setMessages(await res.json());
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const token = await getToken();

      const signRes = await apiFetch("/image/upload-url", token, {
        method: "POST",
        body: JSON.stringify({ filename: file.name }),
      });
      if (!signRes.ok) return;
      const { image_id, upload_url } = await signRes.json();

      await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      await apiFetch(`/image/images/${image_id}/complete`, token, { method: "POST" });

      setThumbnails((prev) => ({ ...prev, [image_id]: URL.createObjectURL(file) }));

      await loadImages();
      setActiveId(image_id);
      setMessages([]);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    const token = await getToken();
    const res = await apiFetch(`/image/images/${id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setImages((prev) => prev.filter((img) => img.id !== id));
    setThumbnails((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  }

  async function handleAsk(question: string) {
    if (!activeId) return;
    const token = await getToken();

    const userMsg: ImageChatMessage = { id: crypto.randomUUID(), role: "user", content: question };
    const assistantMsg: ImageChatMessage = { id: crypto.randomUUID(), role: "assistant", content: "" };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    try {
      const res = await apiFetch(`/image/images/${activeId}/query`, token, {
        method: "POST",
        body: JSON.stringify({ question }),
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
      <ImageList
        images={images}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setMessages([]);
          loadMessages(id);
        }}
        onUpload={handleUpload}
        uploading={uploading}
        thumbnails={thumbnails}
        onDelete={handleDelete}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <ImageMessageThread
          messages={messages}
          previewUrl={activeId ? thumbnails[activeId] : undefined}
        />
        <MessageComposer onSend={handleAsk} disabled={streaming || !activeId} />
      </div>
    </div>
  );
}
