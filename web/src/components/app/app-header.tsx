"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Bell, Moon, Search, Sun } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { getModule } from "@/lib/modules";

export function AppHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  // next-themes resolves the theme only after mount; rendering a fixed icon
  // before that would flash the wrong one on first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const slug = pathname.split("/")[1] ?? "";
  const mod = getModule(slug);
  const title = slug === "admin" ? "Dashboard" : mod?.label ?? "Nexus AI";

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex items-center gap-2">
        {mod && <mod.icon className={`size-4 ${mod.iconColor}`} />}
        <h1 className="text-sm font-medium text-foreground">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Search"
          className="hidden items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
        >
          <Search className="size-3.5" />
          <span>Search</span>
          <kbd className="ml-3 rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </button>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={mounted && resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        <Separator orientation="vertical" className="h-5" />
        <UserButton />
      </div>
    </header>
  );
}
