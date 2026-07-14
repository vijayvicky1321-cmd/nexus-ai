-- AI Notes module: standalone notes table (no child tables), so it follows
-- the simple direct-match org-or-personal RLS pattern from
-- 003_org_scoping.sql rather than the EXISTS-join pattern used for child
-- tables like code_messages. Run this in the Supabase SQL editor against
-- the project.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  title text not null default 'Untitled note',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on notes(user_id);

alter table notes enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- this policy is defense-in-depth / accurate documentation for any future
-- direct-from-browser Supabase access, matching the org-or-personal pattern
-- from 003_org_scoping.sql / 005_coding_assistant.sql.
create policy "notes_all_own" on notes
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
