import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.models.tasks import CreateTaskRequest, Task, UpdateTaskRequest
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/tasks", tags=["tasks"])

TASK_COLUMNS = "id, title, description, due_date, is_done, created_at, updated_at"


async def _get_task_or_404(sb, task_id: str, auth: AuthContext) -> dict:
    res = (
        scope_query(sb.table("tasks").select(TASK_COLUMNS), auth)
        .eq("id", task_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(404, "Task not found")
    return res.data[0]


@router.get("", response_model=list[Task])
async def list_tasks(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("tasks").select(TASK_COLUMNS), auth)
        .order("is_done", desc=False)
        .order("due_date", desc=False, nullsfirst=False)
        .execute()
    )
    return res.data


@router.post("", response_model=Task)
async def create_task(
    body: CreateTaskRequest, auth: AuthContext = Depends(get_current_user)
):
    sb = get_supabase()
    row = {
        "id": str(uuid.uuid4()),
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "title": body.title,
        "description": body.description,
        "due_date": body.due_date.isoformat() if body.due_date else None,
        "is_done": False,
    }
    res = sb.table("tasks").insert(row).execute()
    return res.data[0]


@router.patch("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    body: UpdateTaskRequest,
    auth: AuthContext = Depends(get_current_user),
):
    sb = get_supabase()
    await _get_task_or_404(sb, task_id, auth)

    updates: dict = {}
    if body.title is not None:
        updates["title"] = body.title
    if body.description is not None:
        updates["description"] = body.description
    if body.due_date is not None:
        updates["due_date"] = body.due_date.isoformat()
    if body.is_done is not None:
        updates["is_done"] = body.is_done
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    res = sb.table("tasks").update(updates).eq("id", task_id).execute()
    return res.data[0]


@router.delete("/{task_id}")
async def delete_task(task_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    await _get_task_or_404(sb, task_id, auth)
    sb.table("tasks").delete().eq("id", task_id).execute()
    return {"status": "deleted"}
