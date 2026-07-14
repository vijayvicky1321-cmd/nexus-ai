import type { ModuleDef } from "@/lib/modules";

export function ModuleStub({ module }: { module: ModuleDef }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
        <module.icon className={`size-6 ${module.iconColor}`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-foreground">{module.label}</h1>
        <p className="max-w-md text-sm text-muted-foreground">{module.description}</p>
      </div>
      <span className="rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-muted-foreground">
        Coming soon
      </span>
    </div>
  );
}
