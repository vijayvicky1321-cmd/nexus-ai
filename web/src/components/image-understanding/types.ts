export type ImageStatus = "uploading" | "ready" | "error";

export type ImageRecord = {
  id: string;
  filename: string;
  status: ImageStatus;
  created_at?: string;
};

export type ImageChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
