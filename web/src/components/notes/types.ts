export type Note = {
  id: string;
  title: string;
  content: string;
  updated_at?: string;
};

export type NoteAIAction = "summarize" | "improve" | "expand";
