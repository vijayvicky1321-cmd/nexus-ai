-- Calendar module: standalone events table (no child tables), so it follows
-- the simple direct-match org-or-personal RLS pattern from 006_notes.sql.
-- Run this in the Supabase SQL editor against the project.

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on events(user_id);
create index if not exists events_starts_at_idx on events(starts_at);

alter table events enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- this policy is defense-in-depth / accurate documentation for any future
-- direct-from-browser Supabase access, matching the org-or-personal pattern
-- from 003_org_scoping.sql / 006_notes.sql.
create policy "events_all_own" on events
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
