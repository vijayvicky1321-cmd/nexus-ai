"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { apiFetch } from "@/lib/api-client";
import type { Task } from "@/components/tasks/types";

export default function TasksPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [quickTitle, setQuickTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    const token = await getToken();
    const res = await apiFetch("/tasks", token);
    if (!res.ok) return;
    setTasks(await res.json());
  }, [getToken]);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle("");
    const token = await getToken();
    const res = await apiFetch("/tasks", token, {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return;
    await loadTasks();
  }

  async function handleToggle(task: Task) {
    const next = !task.is_done;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: next } : t)));
    const token = await getToken();
    const res = await apiFetch(`/tasks/${task.id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ is_done: next }),
    });
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: task.is_done } : t)));
    }
  }

  function openEdit(task: Task) {
    setActiveTask(task);
    setDialogOpen(true);
  }

  async function handleSave(values: { title: string; description: string; due_date: string | null }) {
    const token = await getToken();
    const body = {
      title: values.title,
      description: values.description || null,
      due_date: values.due_date,
    };
    const res = activeTask
      ? await apiFetch(`/tasks/${activeTask.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await apiFetch("/tasks", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
    if (!res.ok) return;
    setDialogOpen(false);
    await loadTasks();
  }

  async function handleDelete(task?: Task) {
    const target = task ?? activeTask;
    if (!target) return;
    const confirmed = window.confirm(`Delete "${target.title}"?`);
    if (!confirmed) return;
    const token = await getToken();
    const res = await apiFetch(`/tasks/${target.id}`, token, { method: "DELETE" });
    if (!res.ok) return;
    setDialogOpen(false);
    await loadTasks();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Tasks</h1>
      </div>

      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task and press Enter…"
          className="flex-1 rounded-full"
        />
        <Button
          type="submit"
          className="gap-1.5 rounded-full bg-lime-500 px-5 text-white hover:bg-lime-500/90"
          disabled={!quickTitle.trim()}
        >
          <Plus className="size-4" />
          Add
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            setActiveTask(null);
            setDialogOpen(true);
          }}
        >
          More details
        </Button>
      </form>

      <TaskList tasks={tasks} onToggle={handleToggle} onEdit={openEdit} onDelete={handleDelete} />

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={activeTask}
        onSave={handleSave}
        onDelete={() => handleDelete()}
      />
    </div>
  );
}
