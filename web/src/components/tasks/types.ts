export type Task = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_done: boolean;
  created_at?: string;
  updated_at?: string;
};
