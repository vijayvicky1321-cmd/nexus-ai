export type EmailMode = "reply" | "compose";

export type EmailTone = "professional" | "friendly" | "concise" | "formal";

export type EmailDraft = {
  id: string;
  mode: EmailMode;
  input_context?: string;
  tone?: EmailTone;
  generated_subject?: string;
  generated_body?: string;
  created_at?: string;
};
