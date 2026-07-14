# Nexus AI

A multi-module AI SaaS: one login, one shell, many AI capabilities. This repo
is a vertical slice, not the full product.

## Monorepo layout

```
web/    Next.js 15 (App Router) frontend, TypeScript, Tailwind, shadcn/ui, Clerk
api/    FastAPI backend, OpenAI Responses API, Supabase (Postgres + Storage)
docs/   SQL migrations and architecture notes
```

## Scope of this slice

The product concept spans 12 modules: AI Chat, PDF Chat, Image Understanding,
Voice Assistant, AI Coding Assistant, AI Notes, Calendar, Tasks, Email
Assistant, AI Agents, Team Workspaces, and Admin Dashboard.

This slice implements **AI Chat** and **PDF Chat** end-to-end &mdash; real
auth, real streaming, real persistence, real retrieval &mdash; and leaves the
other 10 as stub routes in the sidebar. The goal was to prove the whole shell
(auth, layout, nav, backend wiring, DB schema, deploy config) works for two
representative modules: one that's pure chat, and one that adds file upload
plus RAG. Every future module reuses the same shell, auth dependency, and
request pattern; see `docs/ARCHITECTURE.md` for how to add one.

## Prerequisites

- Node.js 20+, npm
- Python 3.11+
- Accounts/keys for: Clerk, Supabase, OpenAI (all free-tier friendly)

## Run both services locally

**1. Database.** Create a Supabase project, then run `docs/db/001_init.sql`
against it (SQL editor or `psql`). Create a Storage bucket named
`pdf-documents` (or match whatever you set `SUPABASE_STORAGE_BUCKET` to).

**2. Backend.**

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
# fill in .env: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
# CLERK_SECRET_KEY, CLERK_JWKS_URL, CLERK_ISSUER
uvicorn app.main:app --reload --port 8000
```

**3. Frontend**, in a second terminal:

```bash
cd web
npm install
copy .env.local.example .env.local
# fill in .env.local: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Open `http://localhost:3000`, sign up, and use `/chat` or `/pdf-chat`. The
other 10 sidebar entries render a "Coming soon" placeholder.

## Deployment

`render.yaml` at the repo root defines both services (`nexus-ai-api`,
`nexus-ai-web`) for Render's Blueprint deploys. It has not been deployed as
part of this slice &mdash; review env vars in the Render dashboard before use.

## Notes on what's real vs stubbed

- Stripe billing: `GET/POST /api/billing` on the frontend and `GET /billing/`
  on the backend both return a 501-style "not implemented" response, and
  `/pricing` is a static placeholder. No Stripe SDK or webhook handling exists yet.
- The other 10 modules have route files and sidebar entries but no logic;
  see `web/src/lib/modules.ts` and `web/src/components/app/module-stub.tsx`.
