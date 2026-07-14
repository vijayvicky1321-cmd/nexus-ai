-- AI Coding Assistant module: conversations + messages shaped exactly like
-- 001_init.sql's conversations/messages, plus a code_files table for
-- per-conversation uploaded code files. Files are stored as plain UTF-8 text
-- directly in the `content` column (no chunking/embeddings) since code files
-- are small enough to include in full context, same reasoning PDF Chat uses
-- for its full_text path. Run this in the Supabase SQL editor against the
-- project.

create table if not exists code_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create index if not exists code_conversations_user_id_idx on code_conversations(user_id);

create table if not exists code_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references code_conversations(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists code_messages_conversation_id_idx on code_messages(conversation_id, created_at);

create table if not exists code_files (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references code_conversations(id) on delete cascade,
  user_id text not null,
  org_id text,
  filename text not null,
  storage_path text not null,
  content text,
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists code_files_conversation_id_idx on code_files(conversation_id, created_at);

alter table code_conversations enable row level security;
alter table code_messages enable row level security;
alter table code_files enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- these policies are defense-in-depth / accurate documentation for any
-- future direct-from-browser Supabase access, matching the org-or-personal
-- pattern from 003_org_scoping.sql / 004_image_understanding.sql.
create policy "code_conversations_all_own" on code_conversations
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );

create policy "code_messages_all_own" on code_messages
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from code_conversations c
      where c.id = code_messages.conversation_id
        and c.org_id is not null
        and c.org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from code_conversations c
      where c.id = code_messages.conversation_id
        and c.org_id is not null
        and c.org_id = auth.jwt() ->> 'org_id'
    )
  );

create policy "code_files_all_own" on code_files
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );
