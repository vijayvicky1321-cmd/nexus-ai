-- AI Agents module: plan-then-execute multi-step task runner (no external
-- tool access, no browsing). Follows the same org-or-personal RLS pattern as
-- 006_notes.sql / 007_calendar.sql / 008_tasks.sql / 009_email_assistant.sql.
-- Run this in the Supabase SQL editor against the project.

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  goal text not null,
  status text not null default 'planning' check (status in ('planning', 'running', 'done', 'error')),
  plan jsonb,
  step_results jsonb not null default '[]'::jsonb,
  final_summary text,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_user_id_idx on agent_runs(user_id);

alter table agent_runs enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- this policy is defense-in-depth / accurate documentation for any future
-- direct-from-browser Supabase access, matching the org-or-personal pattern
-- from 003_org_scoping.sql / 006_notes.sql / 007_calendar.sql / 008_tasks.sql
-- / 009_email_assistant.sql.
create policy "agent_runs_all_own" on agent_runs
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
