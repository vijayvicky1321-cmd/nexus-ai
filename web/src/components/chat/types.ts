export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
};

export type Conversation = {
  id: string;
  title: string;
  created_at?: string;
};
