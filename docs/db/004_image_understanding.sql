-- Image Understanding module: images + their Q&A messages. Mirrors the
-- documents/messages shape from 001_init.sql and the org-scoping pattern
-- from 003_org_scoping.sql, but with no embeddings/full_text since
-- questions are answered directly via vision, not RAG.
-- Run this in the Supabase SQL editor against the project.

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  org_id text,
  filename text not null,
  storage_path text not null,
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists images_user_id_idx on images(user_id);

create table if not exists image_messages (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references images(id) on delete cascade,
  user_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists image_messages_image_id_idx on image_messages(image_id, created_at);

alter table images enable row level security;
alter table image_messages enable row level security;

-- The FastAPI backend uses the service-role key and bypasses RLS entirely;
-- these policies are defense-in-depth / accurate documentation for any
-- future direct-from-browser Supabase access, matching the org-or-personal
-- pattern applied to documents/messages in 003_org_scoping.sql.
create policy "images_all_own" on images
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );

create policy "image_messages_all_own" on image_messages
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from images i
      where i.id = image_messages.image_id
        and i.org_id is not null
        and i.org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from images i
      where i.id = image_messages.image_id
        and i.org_id is not null
        and i.org_id = auth.jwt() ->> 'org_id'
    )
  );
