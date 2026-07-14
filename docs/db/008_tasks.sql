-- Tasks module: standalone tasks table (no child tables), so it follows
-- the simple direct-match org-or-personal RLS pattern from 006_notes.sql /
-- 007_calendar.sql. Run this in the Supabase SQL editor against the project.

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  title text not null,
  description text,
  due_date timestamptz,
  is_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks(user_id);

alter table tasks enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- this policy is defense-in-depth / accurate documentation for any future
-- direct-from-browser Supabase access, matching the org-or-personal pattern
-- from 003_org_scoping.sql / 006_notes.sql / 007_calendar.sql.
create policy "tasks_all_own" on tasks
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
