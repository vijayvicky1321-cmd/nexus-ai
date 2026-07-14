import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import AuthContext, get_current_user
from app.core.config import Settings, get_settings

router = APIRouter(prefix="/org", tags=["org"])


@router.get("/members")
async def list_org_members(
    auth: AuthContext = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    if not auth.org_id:
        raise HTTPException(400, "No active organization")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.clerk.com/v1/organizations/{auth.org_id}/memberships",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            timeout=10.0,
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, "Failed to fetch organization members")

    data = resp.json()
    items = data.get("data", data) if isinstance(data, dict) else data

    members = []
    for item in items:
        public_user_data = item.get("public_user_data") or {}
        first_name = public_user_data.get("first_name") or ""
        last_name = public_user_data.get("last_name") or ""
        name = f"{first_name} {last_name}".strip()
        members.append(
            {
                "user_id": public_user_data.get("user_id"),
                "email": public_user_data.get("identifier"),
                "name": name or None,
                "role": item.get("role"),
                "image_url": public_user_data.get("image_url"),
            }
        )
    return members
