# Nexus AI &mdash; web

Next.js 15+ (App Router) frontend. TypeScript, Tailwind CSS v4, shadcn/ui, Clerk auth.

## Implemented

- Marketing landing page (`/`) and pricing placeholder (`/pricing`)
- Clerk sign-in / sign-up
- Authenticated app shell with sidebar listing all 12 modules
- `/chat` &mdash; AI Chat: conversations, streamed responses from the FastAPI backend
- `/pdf-chat` &mdash; PDF Chat: upload, ingest, ask questions with cited chunks
- The other 10 modules are route stubs ("Coming soon") so the app shape is visible

## Setup

```bash
cd web
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` &mdash; from your Clerk application (enable Organizations if you want Team Workspaces later)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` &mdash; from your Supabase project
- `NEXT_PUBLIC_API_URL` &mdash; URL of the running FastAPI backend, `http://localhost:8000` locally

## Run

```bash
npm run dev
```

Visit `http://localhost:3000`. The FastAPI backend (`../api`) must be running for `/chat` and `/pdf-chat` to work.

## shadcn/ui

Components live in `src/components/ui`. This project uses the newer `base` (non-Radix) shadcn preset, so components accept a `render` prop instead of `asChild` for polymorphic rendering (e.g. `<Button render={<Link href="/x">Go</Link>} />`).

To add more components:

```bash
npx shadcn@latest add <component>
```

## Structure

```
src/
  app/
    (marketing)/pricing/     public pricing page
    (auth)/sign-in, sign-up  Clerk auth pages
    (app)/                   authenticated shell; layout renders the sidebar
      chat/                  AI Chat (implemented)
      pdf-chat/              PDF Chat (implemented)
      <other 10 modules>/    stub pages
    api/billing/             stub billing route
  components/
    app/                     sidebar, module stub
    chat/                    AI Chat UI
    pdf-chat/                PDF Chat UI
    ui/                      shadcn/ui primitives
  lib/
    modules.ts               single source of truth for the 12-module nav
    api-client.ts             fetch helper + SSE stream reader for the FastAPI backend
  middleware.ts               Clerk route protection
```
