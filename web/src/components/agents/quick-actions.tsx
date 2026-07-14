"use client";

import { motion } from "framer-motion";
import { FileText, Search, Code2, Table2, FileCode, Workflow, type LucideIcon } from "lucide-react";

type QuickAction = {
  icon: LucideIcon;
  title: string;
  description: string;
  prompt: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: FileText,
    title: "Summarize Document",
    description: "Condense a long document into key points",
    prompt: "Summarize the attached document into a concise executive summary with key takeaways.",
  },
  {
    icon: Search,
    title: "Research Topic",
    description: "Explore a topic and compile findings",
    prompt: "Research the latest trends in renewable energy storage and summarize the findings.",
  },
  {
    icon: Code2,
    title: "Generate Python Code",
    description: "Write a script for a specific task",
    prompt: "Write a Python script that fetches data from a public API and saves it to a CSV file.",
  },
  {
    icon: Table2,
    title: "Analyze CSV",
    description: "Extract insights from tabular data",
    prompt: "Analyze a CSV of monthly sales data and identify key trends and anomalies.",
  },
  {
    icon: FileCode,
    title: "Explain Code",
    description: "Break down what a snippet of code does",
    prompt: "Explain what the following code does step by step and suggest improvements.",
  },
  {
    icon: Workflow,
    title: "Create Workflow",
    description: "Plan a multi-step automation",
    prompt: "Design a step-by-step workflow to automate onboarding a new customer.",
  },
];

export function QuickActions({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {QUICK_ACTIONS.map((action, i) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.title}
            type="button"
            onClick={() => onSelect(action.prompt)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.99 }}
            className="group flex flex-col gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3.5 text-left transition-colors hover:border-border"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-4.5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{action.title}</span>
              <span className="text-xs text-muted-foreground">{action.description}</span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
