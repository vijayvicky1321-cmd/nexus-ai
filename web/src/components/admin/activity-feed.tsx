import type { LucideIcon } from "lucide-react";
import type { AdminActivityItem } from "./types";

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return `${Math.round(diffMonth / 12)}y ago`;
}

export function ActivityFeed({
  items,
  iconFor,
}: {
  items: AdminActivityItem[];
  iconFor: (module: string) => { icon: LucideIcon; color: string };
}) {
  if (items.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const { icon: Icon, color } = iconFor(item.module);
        return (
          <div
            key={`${item.module}-${item.created_at}-${i}`}
            className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-b-0"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className={`size-4 ${color}`} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm text-foreground">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.module}</span>
            </div>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {relativeTime(item.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
