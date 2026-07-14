-- Extends RLS policies from 001_init.sql so org-scoped rows are visible to
-- every member of that org, matching the backend query scoping added for
-- Team Workspaces. The FastAPI backend uses the service-role key and
-- bypasses RLS entirely, so this is defense-in-depth / accurate
-- documentation for any future direct-from-browser Supabase access, not the
-- actual enforcement mechanism.

drop policy if exists "conversations_all_own" on conversations;
create policy "conversations_all_own" on conversations
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );

drop policy if exists "messages_all_own" on messages;
create policy "messages_all_own" on messages
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.org_id is not null
        and c.org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.org_id is not null
        and c.org_id = auth.jwt() ->> 'org_id'
    )
  );

drop policy if exists "documents_all_own" on documents;
create policy "documents_all_own" on documents
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or (org_id is not null and org_id = auth.jwt() ->> 'org_id')
  );

-- match_embeddings previously scoped by (document_id, user_id), which broke
-- retrieval for org members other than the uploader once documents became
-- org-shared. document_id alone is the access boundary: the caller only
-- reaches this RPC after query_document already verified scope_query access
-- to the parent document.
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
  order by embedding <=> query_embedding
  limit match_count
$$;

drop policy if exists "embeddings_all_own" on embeddings;
create policy "embeddings_all_own" on embeddings
  for all
  using (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from documents d
      where d.id = embeddings.document_id
        and d.org_id is not null
        and d.org_id = auth.jwt() ->> 'org_id'
    )
  )
  with check (
    user_id = auth.jwt() ->> 'sub'
    or exists (
      select 1 from documents d
      where d.id = embeddings.document_id
        and d.org_id is not null
        and d.org_id = auth.jwt() ->> 'org_id'
    )
  );
