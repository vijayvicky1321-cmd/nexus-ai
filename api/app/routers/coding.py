import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.config import get_settings
from app.core.scoping import scope_query
from app.models.coding import (
    CodeConversation,
    CodeFile,
    CodeMessage,
    SendCodeMessageRequest,
    UploadUrlRequest,
    UploadUrlResponse,
)
from app.services.openai_client import stream_chat_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/coding", tags=["coding"])

CODING_INSTRUCTIONS = (
    "You are an expert coding assistant. Give clear, correct, well-explained "
    "answers covering explanations, code generation, debugging, and code review. "
    "When writing code, use proper Markdown code blocks with the correct language "
    "tag. When the user has attached files, ground your answers in their actual "
    "content and reference specific parts of the code (function names, line-level "
    "behavior, etc.) rather than speaking generically. Explain your reasoning, not "
    "just the answer."
)


async def _get_conversation_or_404(sb, conversation_id: str, auth: AuthContext):
    convo = (
        scope_query(
            sb.table("code_conversations").select("id").eq("id", conversation_id), auth
        )
        .execute()
    )
    if not convo.data:
        raise HTTPException(404, "Conversation not found")


@router.get("/conversations", response_model=list[CodeConversation])
async def list_conversations(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("code_conversations").select("id, title, created_at"), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/conversations", response_model=CodeConversation)
async def create_conversation(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "title": "New conversation",
    }
    res = sb.table("code_conversations").insert(row).execute()
    return res.data[0]


@router.get("/conversations/{conversation_id}/messages", response_model=list[CodeMessage])
async def list_messages(conversation_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_conversation_or_404(sb, conversation_id, auth)

    res = (
        sb.table("code_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return res.data


@router.get("/conversations/{conversation_id}/files", response_model=list[CodeFile])
async def list_files(conversation_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_conversation_or_404(sb, conversation_id, auth)

    res = (
        sb.table("code_files")
        .select("id, filename, status, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post(
    "/conversations/{conversation_id}/files/upload-url", response_model=UploadUrlResponse
)
async def get_upload_url(
    conversation_id: str,
    body: UploadUrlRequest,
    auth: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    sb = get_supabase()
    await _get_conversation_or_404(sb, conversation_id, auth)

    file_id = str(uuid.uuid4())
    storage_path = f"{auth.user_id}/{conversation_id}/{file_id}/{body.filename}"

    sb.table("code_files").insert(
        {
            "id": file_id,
            "conversation_id": conversation_id,
            "user_id": auth.user_id,
            "org_id": auth.org_id,
            "filename": body.filename,
            "storage_path": storage_path,
            "status": "uploading",
        }
    ).execute()

    signed = sb.storage.from_(settings.supabase_code_bucket).create_signed_upload_url(
        storage_path
    )

    return UploadUrlResponse(
        file_id=file_id,
        upload_url=signed["signed_url"],
        storage_path=storage_path,
    )


@router.post("/conversations/{conversation_id}/files/{file_id}/complete")
async def complete_upload(
    conversation_id: str,
    file_id: str,
    auth: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    sb = get_supabase()
    await _get_conversation_or_404(sb, conversation_id, auth)

    file_res = (
        sb.table("code_files")
        .select("id, storage_path")
        .eq("id", file_id)
        .eq("conversation_id", conversation_id)
        .execute()
    )
    if not file_res.data:
        raise HTTPException(404, "File not found")
    storage_path = file_res.data[0]["storage_path"]

    try:
        raw = sb.storage.from_(settings.supabase_code_bucket).download(storage_path)
        content = raw.decode("utf-8")
        sb.table("code_files").update(
            {"status": "ready", "content": content}
        ).eq("id", file_id).execute()
    except UnicodeDecodeError:
        sb.table("code_files").update({"status": "error"}).eq("id", file_id).execute()
        raise HTTPException(422, "File does not appear to be valid UTF-8 text")
    except Exception:
        sb.table("code_files").update({"status": "error"}).eq("id", file_id).execute()
        raise

    return {"status": "ready"}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_conversation_or_404(sb, conversation_id, auth)
    sb.table("code_messages").delete().eq("conversation_id", conversation_id).execute()
    sb.table("code_files").delete().eq("conversation_id", conversation_id).execute()
    sb.table("code_conversations").delete().eq("id", conversation_id).execute()
    return {"status": "deleted"}


@router.post("/messages")
async def send_message(
    body: SendCodeMessageRequest, auth: AuthContext = Depends(get_current_user)
):
    sb = get_supabase()
    await _get_conversation_or_404(sb, body.conversation_id, auth)

    files_res = (
        sb.table("code_files")
        .select("filename, content")
        .eq("conversation_id", body.conversation_id)
        .eq("status", "ready")
        .execute()
    )

    history_res = (
        sb.table("code_messages")
        .select("role, content")
        .eq("conversation_id", body.conversation_id)
        .order("created_at")
        .execute()
    )

    sb.table("code_messages").insert(
        {
            "id": str(uuid.uuid4()),
            "conversation_id": body.conversation_id,
            "user_id": auth.user_id,
            "role": "user",
            "content": body.message,
        }
    ).execute()

    instructions = CODING_INSTRUCTIONS
    files = files_res.data or []
    if files:
        file_blocks = "\n\n".join(
            f"## File: {f['filename']}\n```\n{f['content']}\n```" for f in files
        )
        instructions += "\n\nThe user has attached the following files:\n\n" + file_blocks

    input_messages = [{"role": m["role"], "content": m["content"]} for m in history_res.data]
    input_messages.append({"role": "user", "content": body.message})

    async def event_generator():
        full_response = ""
        async for delta in stream_chat_response(input_messages, instructions=instructions):
            full_response += delta
            yield {"event": "message", "data": json.dumps({"delta": delta})}

        sb.table("code_messages").insert(
            {
                "id": str(uuid.uuid4()),
                "conversation_id": body.conversation_id,
                "user_id": auth.user_id,
                "role": "assistant",
                "content": full_response,
            }
        ).execute()
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(event_generator())
