# Nexus AI &mdash; api

FastAPI backend for AI Chat and PDF Chat. Verifies Clerk JWTs, talks to Supabase (Postgres + Storage) and OpenAI.

## Setup

```bash
cd api
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

Fill in `.env`:

- `OPENAI_API_KEY` &mdash; from platform.openai.com
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` &mdash; from your Supabase project settings (service role key, not anon &mdash; this backend bypasses RLS and enforces `user_id` scoping in application code)
- `CLERK_SECRET_KEY`, `CLERK_JWKS_URL`, `CLERK_ISSUER` &mdash; from your Clerk application's API keys / JWKS endpoint

Apply the SQL migrations in `../docs/db` to your Supabase project (SQL editor or `psql`) before running ingestion or chat, and create a `pdf-documents` Storage bucket matching `SUPABASE_STORAGE_BUCKET`.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` and `http://localhost:8000/docs`.

## Notes

- If `CLERK_JWKS_URL` is unset and `ENVIRONMENT=development`, JWT signature verification is skipped and claims are read as-is &mdash; convenient for local wiring, never enable this in production.
- `routers/chat.py` and `routers/pdf.py` stream responses over SSE (`sse-starlette`); the frontend's `readSSEStream` helper parses `data: {"delta": "..."}` frames terminated by `data: [DONE]`.
- `routers/pdf.py` calls a `match_embeddings` Postgres function (defined in `docs/db/001_init.sql`) to do the pgvector similarity search scoped to a single document and user.

## Structure

```
app/
  main.py            FastAPI app, CORS, router registration
  core/
    config.py        pydantic-settings env config
    auth.py           Clerk JWT verification dependency
  routers/
    chat.py           conversations + streaming chat
    pdf.py             upload URL, ingestion, RAG query
    billing.py         stub, returns 501
  models/              Pydantic request/response schemas
  services/
    supabase_client.py
    openai_client.py    Responses API streaming + embeddings
    pdf_processing.py   text extraction + chunking
```
