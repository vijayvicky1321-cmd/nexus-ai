"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { MessageSquare, FileText, Image as ImageIcon, Code2, NotebookPen, CalendarDays, ListChecks, Mail, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { StatCard } from "@/components/admin/stat-card";
import { ActivityFeed } from "@/components/admin/activity-feed";
import type { AdminOverview } from "@/components/admin/types";

const STAT_CARDS: {
  key: keyof AdminOverview["counts"];
  label: string;
  icon: LucideIcon;
  iconColor: string;
}[] = [
  { key: "chat_conversations", label: "AI Chat", icon: MessageSquare, iconColor: "text-blue-500" },
  { key: "pdf_documents", label: "PDF Chat", icon: FileText, iconColor: "text-red-500" },
  { key: "images", label: "Image Understanding", icon: ImageIcon, iconColor: "text-cyan-500" },
  { key: "code_conversations", label: "AI Coding Assistant", icon: Code2, iconColor: "text-emerald-500" },
  { key: "notes", label: "AI Notes", icon: NotebookPen, iconColor: "text-yellow-500" },
  { key: "events", label: "Calendar", icon: CalendarDays, iconColor: "text-orange-500" },
  { key: "tasks", label: "Tasks", icon: ListChecks, iconColor: "text-lime-500" },
  { key: "email_drafts", label: "Email Assistant", icon: Mail, iconColor: "text-sky-500" },
  { key: "agent_runs", label: "AI Agents", icon: Bot, iconColor: "text-fuchsia-500" },
];

const MODULE_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  "AI Chat": { icon: MessageSquare, color: "text-blue-500" },
  "PDF Chat": { icon: FileText, color: "text-red-500" },
  "Image Understanding": { icon: ImageIcon, color: "text-cyan-500" },
  "AI Coding Assistant": { icon: Code2, color: "text-emerald-500" },
  "AI Notes": { icon: NotebookPen, color: "text-yellow-500" },
  Calendar: { icon: CalendarDays, color: "text-orange-500" },
  Tasks: { icon: ListChecks, color: "text-lime-500" },
  "Email Assistant": { icon: Mail, color: "text-sky-500" },
  "AI Agents": { icon: Bot, color: "text-fuchsia-500" },
};

function iconForModule(module: string) {
  return MODULE_ICONS[module] ?? { icon: Bot, color: "text-muted-foreground" };
}

export default function AdminPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await apiFetch("/admin/overview", token);
    if (res.ok) setOverview(await res.json());
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const totalItems = overview
    ? Object.values(overview.counts).reduce((sum, n) => sum + n, 0)
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user?.firstName ? `Welcome back, ${user.firstName}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {totalItems === null
            ? "Loading your workspace overview…"
            : `${totalItems} item${totalItems === 1 ? "" : "s"} across every module in ${
                organization?.name ?? "your personal workspace"
              }.`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            iconColor={card.iconColor}
            label={card.label}
            value={overview?.counts[card.key] ?? 0}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Recent activity</h2>
        <div className="rounded-xl border border-border/70 bg-card">
          {loading && !overview ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ActivityFeed items={overview?.recent_activity ?? []} iconFor={iconForModule} />
          )}
        </div>
      </div>
    </div>
  );
}
