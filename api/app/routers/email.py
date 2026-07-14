import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.email import CreateEmailDraftRequest, EmailDraft, GenerateEmailRequest
from app.services.openai_client import stream_chat_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/email", tags=["email"])

DRAFT_COLUMNS = "id, mode, input_context, tone, generated_subject, generated_body, created_at"

MODE_INSTRUCTIONS = {
    "reply": (
        "You are an email assistant. The user received the following email. "
        "Write a clear, well-structured reply in the requested tone. "
        "Output format: first line 'Subject: ...', blank line, then the email body.\n\n"
        "Original email:\n{input_context}"
    ),
    "compose": (
        "You are an email assistant. The user wants to send a new email described as follows. "
        "Write a clear, well-structured email in the requested tone. "
        "Output format: first line 'Subject: ...', blank line, then the email body.\n\n"
        "What the user wants to convey:\n{input_context}"
    ),
}


@router.get("/drafts", response_model=list[EmailDraft])
async def list_drafts(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("email_drafts").select(DRAFT_COLUMNS), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/generate")
async def generate_email(body: GenerateEmailRequest, auth: AuthContext = Depends(get_current_user)):
    tone = body.tone or "professional"
    instructions = MODE_INSTRUCTIONS[body.mode].format(input_context=body.input_context)
    instructions = f"{instructions}\n\nRequested tone: {tone}."
    input_messages = [{"role": "user", "content": body.input_context}]

    async def event_generator():
        async for delta in stream_chat_response(input_messages, instructions=instructions):
            yield {"event": "message", "data": json.dumps({"delta": delta})}
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(event_generator())


@router.post("/drafts", response_model=EmailDraft)
async def create_draft(body: CreateEmailDraftRequest, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "mode": body.mode,
        "input_context": body.input_context,
        "tone": body.tone,
        "generated_subject": body.generated_subject,
        "generated_body": body.generated_body,
    }
    res = sb.table("email_drafts").insert(row).execute()
    return res.data[0]


@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("email_drafts").select("id"), auth)
        .eq("id", draft_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Draft not found")
    sb.table("email_drafts").delete().eq("id", draft_id).execute()
    return {"status": "deleted"}
