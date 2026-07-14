import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Mic,
  Code2,
  NotebookPen,
  CalendarDays,
  ListChecks,
  Mail,
  Bot,
  Users,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

export type ModuleSection =
  | "AI Workspace"
  | "Knowledge"
  | "Productivity"
  | "Collaboration"
  | "Administration";

export type ModuleDef = {
  slug: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  implemented: boolean;
  description: string;
  section: ModuleSection;
};

export const MODULES: ModuleDef[] = [
  {
    slug: "chat",
    label: "AI Chat",
    icon: MessageSquare,
    iconColor: "text-blue-500",
    implemented: true,
    description: "Conversational assistant powered by OpenAI, with persisted history.",
    section: "AI Workspace",
  },
  {
    slug: "agents",
    label: "AI Agents",
    icon: Bot,
    iconColor: "text-fuchsia-500",
    implemented: true,
    description: "Configure autonomous agents to run multi-step workflows.",
    section: "AI Workspace",
  },
  {
    slug: "coding-assistant",
    label: "AI Coding",
    icon: Code2,
    iconColor: "text-emerald-500",
    implemented: true,
    description: "Chat-driven coding help scoped to your project context.",
    section: "AI Workspace",
  },
  {
    slug: "voice-assistant",
    label: "Voice Assistant",
    icon: Mic,
    iconColor: "text-rose-500",
    implemented: true,
    description: "Talk to the assistant with real-time speech in and out.",
    section: "AI Workspace",
  },
  {
    slug: "pdf-chat",
    label: "PDF Chat",
    icon: FileText,
    iconColor: "text-red-500",
    implemented: true,
    description: "Upload a PDF and ask questions grounded in its contents.",
    section: "Knowledge",
  },
  {
    slug: "image-understanding",
    label: "Image Understanding",
    icon: ImageIcon,
    iconColor: "text-cyan-500",
    implemented: true,
    description: "Upload images and ask questions about their contents.",
    section: "Knowledge",
  },
  {
    slug: "notes",
    label: "AI Notes",
    icon: NotebookPen,
    iconColor: "text-yellow-500",
    implemented: true,
    description: "AI-assisted note taking with summarization and search.",
    section: "Knowledge",
  },
  {
    slug: "calendar",
    label: "Calendar",
    icon: CalendarDays,
    iconColor: "text-orange-500",
    implemented: true,
    description: "Schedule and manage events with AI scheduling suggestions.",
    section: "Productivity",
  },
  {
    slug: "tasks",
    label: "Tasks",
    icon: ListChecks,
    iconColor: "text-lime-500",
    implemented: true,
    description: "Task management with AI-generated breakdowns and reminders.",
    section: "Productivity",
  },
  {
    slug: "email-assistant",
    label: "Email Assistant",
    icon: Mail,
    iconColor: "text-sky-500",
    implemented: true,
    description: "Draft, summarize, and triage email with AI assistance.",
    section: "Productivity",
  },
  {
    slug: "workspaces",
    label: "Team Workspaces",
    icon: Users,
    iconColor: "text-indigo-500",
    implemented: true,
    description: "Shared organization workspaces, backed by Clerk Organizations.",
    section: "Collaboration",
  },
  {
    slug: "admin",
    label: "Admin Dashboard",
    icon: ShieldCheck,
    iconColor: "text-teal-500",
    implemented: true,
    description: "A personal overview of your activity across every module.",
    section: "Administration",
  },
  {
    slug: "account",
    label: "Account",
    icon: UserCircle,
    iconColor: "text-slate-500",
    implemented: false,
    description: "Manage your personal account details.",
    section: "Administration",
  },
];

export const MODULE_SECTIONS: ModuleSection[] = [
  "AI Workspace",
  "Knowledge",
  "Productivity",
  "Collaboration",
  "Administration",
];

export function getModule(slug: string): ModuleDef | undefined {
  return MODULES.find((m) => m.slug === slug);
}
