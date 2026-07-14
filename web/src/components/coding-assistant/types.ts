export type CodeConversation = {
  id: string;
  title: string;
  created_at?: string;
};

export type CodeFileStatus = "uploading" | "ready" | "error";

export type CodeFile = {
  id: string;
  filename: string;
  status: CodeFileStatus;
  created_at?: string;
};

export type CodeChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
