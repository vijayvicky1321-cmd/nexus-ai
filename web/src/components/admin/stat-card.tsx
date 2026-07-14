import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3.5 transition-colors hover:border-border">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`size-4.5 ${iconColor}`} />
      </div>
      <div className="flex flex-col">
        <span className="font-mono text-2xl leading-tight font-semibold tabular-nums">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
