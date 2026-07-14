"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileCode, Upload, Loader2 } from "lucide-react";
import type { CodeFile } from "./types";

const MAX_FILE_SIZE_BYTES = 1024 * 1024;

export function CodeFileList({
  files,
  onUpload,
  uploading,
}: {
  files: CodeFile[];
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col border-t border-border/70">
      <div className="p-2.5">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > MAX_FILE_SIZE_BYTES) {
              setError("File is too large (max 1MB).");
              return;
            }
            setError(null);
            onUpload(file);
          }}
        />
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <div className="max-h-48 overflow-y-auto px-2 pb-2">
        {files.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">No files attached.</p>
        )}
        {files.map((f) => (
          <div
            key={f.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
              f.status === "error" && "text-destructive"
            )}
          >
            <FileCode className="size-4 shrink-0 text-emerald-500" />
            <span className="flex-1 truncate">{f.filename}</span>
            {f.status !== "ready" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {f.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
