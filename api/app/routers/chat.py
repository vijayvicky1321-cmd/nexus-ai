import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.chat import ChatMessage, Conversation, SendMessageRequest
from app.services.openai_client import stream_chat_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/conversations", response_model=list[Conversation])
async def list_conversations(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("conversations").select("id, title, created_at"), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/conversations", response_model=Conversation)
async def create_conversation(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "title": "New conversation",
    }
    res = sb.table("conversations").insert(row).execute()
    return res.data[0]


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessage])
async def list_messages(conversation_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    convo = (
        scope_query(sb.table("conversations").select("id").eq("id", conversation_id), auth)
        .execute()
    )
    if not convo.data:
        raise HTTPException(404, "Conversation not found")

    res = (
        sb.table("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return res.data


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    convo = (
        scope_query(sb.table("conversations").select("id").eq("id", conversation_id), auth)
        .execute()
    )
    if not convo.data:
        raise HTTPException(404, "Conversation not found")
    sb.table("messages").delete().eq("conversation_id", conversation_id).execute()
    sb.table("conversations").delete().eq("id", conversation_id).execute()
    return {"status": "deleted"}


@router.post("/messages")
async def send_message(body: SendMessageRequest, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    convo = (
        scope_query(
            sb.table("conversations").select("id").eq("id", body.conversation_id), auth
        )
        .execute()
    )
    if not convo.data:
        raise HTTPException(404, "Conversation not found")

    history_res = (
        sb.table("messages")
        .select("role, content")
        .eq("conversation_id", body.conversation_id)
        .order("created_at")
        .execute()
    )

    sb.table("messages").insert(
        {
            "id": str(uuid.uuid4()),
            "conversation_id": body.conversation_id,
            "user_id": auth.user_id,
            "role": "user",
            "content": body.message,
        }
    ).execute()

    input_messages = [{"role": m["role"], "content": m["content"]} for m in history_res.data]
    input_messages.append({"role": "user", "content": body.message})

    async def event_generator():
        full_response = ""
        async for delta in stream_chat_response(input_messages):
            full_response += delta
            yield {"event": "message", "data": json.dumps({"delta": delta})}

        sb.table("messages").insert(
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
