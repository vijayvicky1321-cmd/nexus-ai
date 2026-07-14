-- Nexus AI initial schema: users, conversations, messages, documents, embeddings.
-- Run this in the Supabase SQL editor (or via psql) against a fresh project.

create extension if not exists vector;

-- Mirrors the subset of a Clerk user we need locally. Clerk remains the
-- source of truth for auth; this row exists so other tables can FK to it
-- and so RLS policies have something to compare auth.uid()/JWT claims against.
create table if not exists users (
  id text primary key,                 -- Clerk user id (sub claim)
  org_id text,                         -- Clerk organization id, nullable for personal accounts
  email text,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  title text not null default 'New conversation',
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx on conversations(user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages(conversation_id, created_at);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  filename text not null,
  storage_path text not null,
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'ready', 'error')),
  full_text text,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on documents(user_id);

create table if not exists embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  chunk_index int not null,
  chunk_text text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists embeddings_document_id_idx on embeddings(document_id);

-- ivfflat requires an approximate row count to pick list count sensibly;
-- 100 lists is a reasonable default for a few hundred thousand chunks and
-- can be re-tuned later with `alter index ... set (lists = N)`.
create index if not exists embeddings_embedding_ivfflat_idx
  on embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Similarity search scoped to a single document and user, used by the PDF
-- Chat query endpoint. Runs as a Postgres function so the FastAPI service
-- (using the service-role key) can call it via `sb.rpc(...)` in one round trip.
create or replace function match_embeddings(
  query_embedding vector(1536),
  match_document_id uuid,
  match_user_id text,
  match_count int default 5
)
returns table (
  chunk_index int,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    chunk_index,
    chunk_text,
    1 - (embedding <=> query_embedding) as similarity
  from embeddings
  where document_id = match_document_id
    and user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;

alter table users enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table documents enable row level security;
alter table embeddings enable row level security;

-- The FastAPI backend uses the Supabase service-role key, which bypasses RLS
-- entirely; these policies protect any future direct-from-browser access
-- (e.g. anon-key reads) so a user can only ever see their own rows. Clerk's
-- JWT template must inject a `sub` claim that Supabase maps to
-- auth.jwt() ->> 'sub' for these to take effect for a Supabase-issued session.
create policy "users_select_own" on users
  for select using (id = auth.jwt() ->> 'sub');

create policy "conversations_all_own" on conversations
  for all using (user_id = auth.jwt() ->> 'sub')
  with check (user_id = auth.jwt() ->> 'sub');

create policy "messages_all_own" on messages
  for all using (user_id = auth.jwt() ->> 'sub')
  with check (user_id = auth.jwt() ->> 'sub');

create policy "documents_all_own" on documents
  for all using (user_id = auth.jwt() ->> 'sub')
  with check (user_id = auth.jwt() ->> 'sub');

create policy "embeddings_all_own" on embeddings
  for all using (user_id = auth.jwt() ->> 'sub')
  with check (user_id = auth.jwt() ->> 'sub');
