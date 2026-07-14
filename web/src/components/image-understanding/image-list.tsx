"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Upload, Loader2, X } from "lucide-react";
import type { ImageRecord } from "./types";

export function ImageList({
  images,
  activeId,
  onSelect,
  onUpload,
  uploading,
  thumbnails,
  onDelete,
}: {
  images: ImageRecord[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onUpload: (file: File) => void;
  uploading: boolean;
  thumbnails: Record<string, string>;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/70">
      <div className="p-2.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading…" : "Upload Image"}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {images.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">No images yet.</p>
        )}
        {images.map((img) => {
          const active = activeId === img.id;
          return (
            <div
              key={img.id}
              className={cn(
                "group relative flex w-full items-center gap-2 rounded-lg text-left text-sm transition-colors hover:bg-accent/60",
                active ? "bg-accent text-accent-foreground" : "text-foreground/90"
              )}
            >
              {active && (
                <span className="absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full bg-primary" />
              )}
              <button onClick={() => onSelect(img.id)} className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2">
                {thumbnails[img.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnails[img.id]}
                    alt={img.filename}
                    className="size-8 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-cyan-500" />
                )}
                <span className="flex-1 truncate">{img.filename}</span>
                {img.status !== "ready" && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {img.status}
                  </span>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(img.id);
                }}
                aria-label="Close image"
                className="mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
