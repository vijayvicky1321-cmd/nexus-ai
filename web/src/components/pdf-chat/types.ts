export type DocumentStatus = "uploading" | "processing" | "ready" | "error";

export type PdfDocument = {
  id: string;
  filename: string;
  status: DocumentStatus;
  created_at?: string;
};

export type Citation = {
  chunk_index: number;
  chunk_text: string;
};

export type PdfChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};
