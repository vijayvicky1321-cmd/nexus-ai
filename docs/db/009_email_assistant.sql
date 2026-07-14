-- Email Assistant module: AI compose/reply drafting tool (no inbox connection).
-- Standalone table, so it follows the same simple direct-match org-or-personal
-- RLS pattern as 006_notes.sql / 007_calendar.sql / 008_tasks.sql. Run this in
-- the Supabase SQL editor against the project.

create table if not exists email_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  mode text not null check (mode in ('reply', 'compose')),
  input_context text,
  tone text,
  generated_subject text,
  generated_body text,
  created_at timestamptz not null default now()
);

create index if not exists email_drafts_user_id_idx on email_drafts(user_id);

alter table email_drafts enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- this policy is defense-in-depth / accurate documentation for any future
-- direct-from-browser Supabase access, matching the org-or-personal pattern
-- from 003_org_scoping.sql / 006_notes.sql / 007_calendar.sql / 008_tasks.sql.
create policy "email_drafts_all_own" on email_drafts
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
