import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.config import get_settings
from app.core.scoping import scope_query
from app.models.pdf import PdfDocument, QueryRequest, UploadUrlRequest, UploadUrlResponse
from app.services.openai_client import embed_texts, stream_chat_response
from app.services.pdf_processing import chunk_text, extract_text
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/pdf", tags=["pdf"])


@router.get("/documents", response_model=list[PdfDocument])
async def list_documents(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("documents").select("id, filename, status, created_at"), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(body: UploadUrlRequest, auth: AuthContext = Depends(get_current_user)):
    settings = get_settings()
    sb = get_supabase()
    document_id = str(uuid.uuid4())
    storage_path = f"{auth.user_id}/{document_id}/{body.filename}"

    sb.table("documents").insert(
        {
            "id": document_id,
            "user_id": auth.user_id,
            "org_id": auth.org_id,
            "filename": body.filename,
            "storage_path": storage_path,
            "status": "uploading",
        }
    ).execute()

    signed = sb.storage.from_(settings.supabase_storage_bucket).create_signed_upload_url(
        storage_path
    )

    return UploadUrlResponse(
        document_id=document_id,
        upload_url=signed["signed_url"],
        storage_path=storage_path,
    )


@router.post("/documents/{document_id}/ingest")
async def ingest_document(document_id: str, auth: AuthContext = Depends(get_current_user)):
    settings = get_settings()
    sb = get_supabase()

    doc_res = (
        scope_query(
            sb.table("documents").select("id, storage_path").eq("id", document_id), auth
        )
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    storage_path = doc_res.data[0]["storage_path"]

    sb.table("documents").update({"status": "processing"}).eq("id", document_id).execute()

    try:
        pdf_bytes = sb.storage.from_(settings.supabase_storage_bucket).download(storage_path)
        text = extract_text(pdf_bytes)
        chunks = chunk_text(text)

        if not chunks:
            sb.table("documents").update({"status": "error"}).eq("id", document_id).execute()
            raise HTTPException(422, "No extractable text in PDF")

        vectors = await embed_texts(chunks)

        rows = [
            {
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "user_id": auth.user_id,
                "chunk_index": i,
                "chunk_text": chunk,
                "embedding": vector,
            }
            for i, (chunk, vector) in enumerate(zip(chunks, vectors))
        ]
        sb.table("embeddings").insert(rows).execute()

        sb.table("documents").update(
            {"status": "ready", "full_text": text}
        ).eq("id", document_id).execute()
    except HTTPException:
        raise
    except Exception:
        sb.table("documents").update({"status": "error"}).eq("id", document_id).execute()
        raise

    return {"status": "ready", "chunk_count": len(chunks)}


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, auth: AuthContext = Depends(get_current_user)):
    settings = get_settings()
    sb = get_supabase()
    doc_res = (
        scope_query(
            sb.table("documents").select("id, storage_path").eq("id", document_id), auth
        )
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    storage_path = doc_res.data[0]["storage_path"]

    sb.table("embeddings").delete().eq("document_id", document_id).execute()
    sb.table("documents").delete().eq("id", document_id).execute()
    try:
        sb.storage.from_(settings.supabase_storage_bucket).remove([storage_path])
    except Exception:
        pass
    return {"status": "deleted"}


@router.post("/documents/{document_id}/query")
async def query_document(
    document_id: str,
    body: QueryRequest,
    auth: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    sb = get_supabase()

    doc_res = (
        scope_query(
            sb.table("documents").select("id, status, full_text").eq("id", document_id), auth
        )
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    doc = doc_res.data[0]
    if doc["status"] != "ready":
        raise HTTPException(409, "Document is not ready for querying yet")

    full_text = doc.get("full_text") or ""
    citations: list[dict] = []

    if full_text and len(full_text) <= settings.full_text_context_char_limit:
        instructions = (
            "You are analyzing the full document below to answer the user's question. "
            "Write a thorough, well-organized analysis in Markdown:\n"
            "- Use ## headers to separate sections\n"
            "- Use **bold** for key terms, names, dates, and figures\n"
            "- Use a Markdown table when presenting structured or chronological data\n"
            "- Go beyond restating facts: surface patterns, risks, inconsistencies, "
            "and implications a careful reader would flag\n"
            "- Reference concrete details and figures from the document, not generic statements\n"
            "If the answer isn't in the document, say so.\n\nDocument:\n" + full_text
        )
    else:
        [question_vector] = await embed_texts([body.question])
        matches = sb.rpc(
            "match_embeddings",
            {
                "query_embedding": question_vector,
                "match_document_id": document_id,
                "match_user_id": auth.user_id,
                "match_count": settings.retrieval_top_k,
            },
        ).execute()

        chunks = matches.data or []
        context = "\n\n".join(f"[{c['chunk_index']}] {c['chunk_text']}" for c in chunks)
        citations = [
            {"chunk_index": c["chunk_index"], "chunk_text": c["chunk_text"]} for c in chunks
        ]

        instructions = (
            "Answer the user's question using only the provided document excerpts. "
            "Cite excerpt numbers like [0] when relevant. If the answer isn't in the "
            "excerpts, say so.\n\nExcerpts:\n" + context
        )

    async def event_generator():
        async for delta in stream_chat_response(
            [{"role": "user", "content": body.question}], instructions=instructions
        ):
            yield {"event": "message", "data": json.dumps({"delta": delta})}
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(
        event_generator(), headers={"X-Citations": json.dumps(citations)}
    )
