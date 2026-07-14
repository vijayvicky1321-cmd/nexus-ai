export type AdminCounts = {
  chat_conversations: number;
  pdf_documents: number;
  images: number;
  code_conversations: number;
  notes: number;
  events: number;
  tasks: number;
  email_drafts: number;
  agent_runs: number;
};

export type AdminActivityItem = {
  module: string;
  title: string;
  created_at: string;
};

export type AdminOverview = {
  counts: AdminCounts;
  recent_activity: AdminActivityItem[];
};
