from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.core.auth import AuthContext, get_current_user
from app.core.scoping import scope_query
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])

# (table, counts-key, title-column) — title_column is used to build the
# recent_activity blurb; None means fall back to a generic label.
_COUNT_TABLES = [
    ("conversations", "chat_conversations", "title"),
    ("documents", "pdf_documents", "filename"),
    ("images", "images", "filename"),
    ("code_conversations", "code_conversations", "title"),
    ("notes", "notes", "title"),
    ("events", "events", "title"),
    ("tasks", "tasks", "title"),
    ("email_drafts", "email_drafts", "generated_subject"),
    ("agent_runs", "agent_runs", "goal"),
]

_MODULE_LABELS = {
    "chat_conversations": "AI Chat",
    "pdf_documents": "PDF Chat",
    "images": "Image Understanding",
    "code_conversations": "AI Coding Assistant",
    "notes": "AI Notes",
    "events": "Calendar",
    "tasks": "Tasks",
    "email_drafts": "Email Assistant",
    "agent_runs": "AI Agents",
}

_RECENT_LIMIT_PER_TABLE = 5
_RECENT_CAP = 20


@router.get("/overview")
async def get_overview(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()

    counts: dict[str, int] = {}
    for table, key, _ in _COUNT_TABLES:
        res = scope_query(
            sb.table(table).select("id", count="exact", head=True), auth
        ).execute()
        counts[key] = res.count or 0

    recent_activity: list[dict] = []
    for table, key, title_col in _COUNT_TABLES:
        cols = f"id, created_at, {title_col}" if title_col else "id, created_at"
        res = (
            scope_query(sb.table(table).select(cols), auth)
            .order("created_at", desc=True)
            .limit(_RECENT_LIMIT_PER_TABLE)
            .execute()
        )
        module_label = _MODULE_LABELS[key]
        for row in res.data:
            title = (row.get(title_col) if title_col else None) or module_label
            recent_activity.append(
                {
                    "module": module_label,
                    "title": title,
                    "created_at": row["created_at"],
                }
            )

    def _sort_key(item: dict) -> datetime:
        ts = item["created_at"]
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        dt = datetime.fromisoformat(ts)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    recent_activity.sort(key=_sort_key, reverse=True)
    recent_activity = recent_activity[:_RECENT_CAP]

    return {"counts": counts, "recent_activity": recent_activity}
