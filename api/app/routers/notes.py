import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.notes import Note, NoteAIActionRequest, UpdateNoteRequest
from app.services.openai_client import stream_chat_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/notes", tags=["notes"])

AI_ACTION_INSTRUCTIONS = {
    "summarize": "Summarize the following note concisely, preserving key points.",
    "improve": "Improve the clarity, grammar, and flow of the following note without changing its meaning.",
    "expand": "Expand on the following note with more detail and relevant elaboration.",
}


async def _get_note_or_404(sb, note_id: str, auth: AuthContext) -> dict:
    res = (
        scope_query(sb.table("notes").select("id, title, content"), auth)
        .eq("id", note_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Note not found")
    return res.data[0]


@router.get("", response_model=list[Note])
async def list_notes(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("notes").select("id, title, content, updated_at"), auth)
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data


@router.post("", response_model=Note)
async def create_note(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "title": "Untitled note",
        "content": "",
    }
    res = sb.table("notes").insert(row).execute()
    return res.data[0]


@router.get("/{note_id}", response_model=Note)
async def get_note(note_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    note = await _get_note_or_404(sb, note_id, auth)
    return note


@router.patch("/{note_id}", response_model=Note)
async def update_note(
    note_id: str, body: UpdateNoteRequest, auth: AuthContext = Depends(get_current_user)
):
    sb = get_supabase()
    await _get_note_or_404(sb, note_id, auth)

    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.title is not None:
        updates["title"] = body.title
    if body.content is not None:
        updates["content"] = body.content

    res = sb.table("notes").update(updates).eq("id", note_id).execute()
    return res.data[0]


@router.delete("/{note_id}")
async def delete_note(note_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_note_or_404(sb, note_id, auth)
    sb.table("notes").delete().eq("id", note_id).execute()
    return {"status": "deleted"}


@router.post("/{note_id}/ai-action")
async def note_ai_action(
    note_id: str, body: NoteAIActionRequest, auth: AuthContext = Depends(get_current_user)
):
    sb = get_supabase()
    note = await _get_note_or_404(sb, note_id, auth)

    instructions = AI_ACTION_INSTRUCTIONS[body.action]
    input_messages = [{"role": "user", "content": note["content"]}]

    async def event_generator():
        async for delta in stream_chat_response(input_messages, instructions=instructions):
            yield {"event": "message", "data": json.dumps({"delta": delta})}
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(event_generator())
