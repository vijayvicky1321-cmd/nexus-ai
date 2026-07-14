import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MODULES } from "@/lib/modules";

export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="text-lg font-semibold">Nexus AI</span>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" render={<Link href="/sign-in">Sign in</Link>} />
          <Button render={<Link href="/sign-up">Get started</Link>} />
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-16 px-6 py-24 text-center">
        <div className="flex flex-col items-center gap-6">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Every AI capability your team needs, in one workspace.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Chat, PDF Q&amp;A, voice, coding help, notes, and more &mdash; unified
            under one login, one sidebar, one workspace.
          </p>
          <div className="flex gap-3">
            <Button size="lg" render={<Link href="/sign-up">Start for free</Link>} />
            <Button size="lg" variant="outline" render={<Link href="/sign-in">Sign in</Link>} />
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-4 text-left sm:grid-cols-3 lg:grid-cols-4">
          {MODULES.map((mod) => (
            <div
              key={mod.slug}
              className="flex flex-col gap-2 rounded-lg border bg-background p-4"
            >
              <mod.icon className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{mod.label}</span>
              {!mod.implemented && (
                <span className="text-xs text-muted-foreground">Coming soon</span>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Nexus AI. All rights reserved.
      </footer>
    </div>
  );
}
