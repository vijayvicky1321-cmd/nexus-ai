# Architecture

## Module status

| Module | Slug | Status |
|---|---|---|
| AI Chat | `chat` | Implemented |
| PDF Chat | `pdf-chat` | Implemented |
| Image Understanding | `image-understanding` | Stub |
| Voice Assistant | `voice-assistant` | Stub |
| AI Coding Assistant | `coding-assistant` | Stub |
| AI Notes | `notes` | Stub |
| Calendar | `calendar` | Stub |
| Tasks | `tasks` | Stub |
| Email Assistant | `email-assistant` | Stub |
| AI Agents | `agents` | Stub |
| Team Workspaces | `workspaces` | Stub (maps to Clerk Organizations) |
| Admin Dashboard | `admin` | Stub |

The module list is defined once, in `web/src/lib/modules.ts`, and drives both
the sidebar and the stub pages. Adding a module elsewhere in this doc without
updating that file will not change the app.

## Request flow: AI Chat

1. Browser calls Clerk (`useAuth().getToken()`) for a session JWT.
2. `POST /chat/messages` on the FastAPI backend, bearer token attached.
3. `app/core/auth.py` verifies the JWT against Clerk's JWKS and extracts `user_id`/`org_id`.
4. The router loads prior messages for the conversation from Supabase Postgres, appends the new user message, and calls the OpenAI Responses API in streaming mode.
5. Deltas are relayed to the browser over SSE as they arrive; the frontend appends them to the in-progress assistant message.
6. Once the stream ends, the full assistant message is persisted to the `messages` table.

```
Next.js (/chat) -> FastAPI (/chat/messages) -> Supabase (history read)
                                             -> OpenAI Responses API (stream)
                                             -> Supabase (message write)
```

## Request flow: PDF Chat

1. Upload: frontend requests a signed upload URL from `POST /pdf/upload-url`; FastAPI creates a `documents` row (`status=uploading`) and asks Supabase Storage for a signed PUT URL. The browser uploads the PDF directly to Supabase Storage (the file bytes never pass through FastAPI).
2. Ingest: frontend calls `POST /pdf/documents/{id}/ingest`. FastAPI downloads the file from Storage, extracts text with `pypdf`, chunks it, embeds each chunk with the OpenAI embeddings API, and stores the vectors in the `embeddings` pgvector table. Document status moves `processing -> ready` (or `error`).
3. Query: frontend calls `POST /pdf/documents/{id}/query` with a question. FastAPI embeds the question, runs a `match_embeddings` Postgres RPC (cosine similarity, scoped to `document_id` + `user_id`), and passes the retrieved chunks as context to the OpenAI Responses API. The answer streams back over SSE; a `X-Citations` response header carries the chunks used so the UI can render them.

```
Next.js (/pdf-chat) -> FastAPI (/pdf/upload-url) -> Supabase Storage (signed URL)
                     -> Supabase Storage (direct PUT upload)
                     -> FastAPI (/ingest) -> pypdf extract -> chunk -> OpenAI embeddings -> Supabase pgvector
                     -> FastAPI (/query)  -> OpenAI embeddings -> Supabase match_embeddings RPC
                                           -> OpenAI Responses API (stream, grounded in chunks)
```

## Adding a future module

Each stub already has the shape a real module needs:

1. Flip `implemented: false -> true` for its entry in `web/src/lib/modules.ts` (this alone removes the "Soon" badge and the stub page).
2. Replace `web/src/app/(app)/<slug>/page.tsx` with real UI, following the pattern in `chat/` or `pdf-chat/` (client component, calls `apiFetch` with a Clerk token).
3. Add a FastAPI router in `api/app/routers/<name>.py`, register it in `api/app/main.py`.
4. Add any new tables via a new `docs/db/00N_<name>.sql` migration, with RLS policies scoped by `user_id`/`org_id` following the pattern in `001_init.sql`.

No changes to the sidebar, auth, or shell are needed — they are already generic over the module list.

## Team Workspaces and Clerk Organizations

Clerk Organizations are used as-is for the future Team Workspaces module:
`org_id` is already threaded through `AuthContext`, the `conversations` and
`documents` tables, and JWT claims. A workspaces module would mostly be a UI
over data that's already scoped correctly.
