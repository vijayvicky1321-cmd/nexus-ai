import uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.calendar import CreateEventRequest, Event, UpdateEventRequest
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/calendar", tags=["calendar"])

EVENT_COLUMNS = "id, title, description, starts_at, ends_at, created_at"


async def _get_event_or_404(sb, event_id: str, auth: AuthContext) -> dict:
    res = (
        scope_query(sb.table("events").select(EVENT_COLUMNS), auth)
        .eq("id", event_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Event not found")
    return res.data[0]


@router.get("/events", response_model=list[Event])
async def list_events(
    from_: str = Query(..., alias="from"),
    to: str = Query(...),
    auth: AuthContext = Depends(get_current_user),
):
    sb = get_supabase()
    res = (
        scope_query(sb.table("events").select(EVENT_COLUMNS), auth)
        .gte("starts_at", from_)
        .lte("starts_at", to)
        .order("starts_at", desc=False)
        .execute()
    )
    return res.data


@router.post("/events", response_model=Event)
async def create_event(
    body: CreateEventRequest, auth: AuthContext = Depends(get_current_user)
):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "title": body.title,
        "description": body.description,
        "starts_at": body.starts_at.isoformat(),
        "ends_at": body.ends_at.isoformat() if body.ends_at else None,
    }
    res = sb.table("events").insert(row).execute()
    return res.data[0]


@router.patch("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    body: UpdateEventRequest,
    auth: AuthContext = Depends(get_current_user),
):
    sb = get_supabase()
    await _get_event_or_404(sb, event_id, auth)

    updates: dict = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.starts_at is not None:
        updates["starts_at"] = body.starts_at.isoformat()
    if body.ends_at is not None:
        updates["ends_at"] = body.ends_at.isoformat()

    res = sb.table("events").update(updates).eq("id", event_id).execute()
    return res.data[0]


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_event_or_404(sb, event_id, auth)
    sb.table("events").delete().eq("id", event_id).execute()
    return {"status": "deleted"}
