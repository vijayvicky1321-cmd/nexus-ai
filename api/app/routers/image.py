import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.core.auth import AuthContext, get_current_user
from app.core.config import get_settings
from app.core.scoping import scope_query
from app.models.image import (
    ImageMessage,
    ImageQueryRequest,
    ImageRecord,
    ImageUploadUrlRequest,
    ImageUploadUrlResponse,
)
from app.services.openai_client import stream_vision_response
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/image", tags=["image"])

VISION_INSTRUCTIONS = (
    "You are analyzing the image the user has uploaded to answer their question. "
    "Describe what you observe precisely and answer directly. If the image doesn't "
    "contain enough information to answer, say so."
)


@router.get("/images", response_model=list[ImageRecord])
async def list_images(auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    res = (
        scope_query(sb.table("images").select("id, filename, status, created_at"), auth)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/upload-url", response_model=ImageUploadUrlResponse)
async def get_upload_url(
    body: ImageUploadUrlRequest, auth: AuthContext = Depends(get_current_user)
):
    settings = get_settings()
    sb = get_supabase()
    image_id = str(uuid.uuid4())
    storage_path = f"{auth.user_id}/{image_id}/{body.filename}"

    sb.table("images").insert(
        {
            "id": image_id,
            "user_id": auth.user_id,
            "org_id": auth.org_id,
            "filename": body.filename,
            "storage_path": storage_path,
            "status": "uploading",
        }
    ).execute()

    signed = sb.storage.from_(settings.supabase_images_bucket).create_signed_upload_url(
        storage_path
    )

    return ImageUploadUrlResponse(
        image_id=image_id,
        upload_url=signed["signed_url"],
        storage_path=storage_path,
    )


@router.post("/images/{image_id}/complete")
async def complete_image(image_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    img_res = (
        scope_query(sb.table("images").select("id").eq("id", image_id), auth).execute()
    )
    if not img_res.data:
        raise HTTPException(404, "Image not found")

    sb.table("images").update({"status": "ready"}).eq("id", image_id).execute()
    return {"status": "ready"}


@router.get("/images/{image_id}/messages", response_model=list[ImageMessage])
async def list_messages(image_id: str, auth: AuthContext = Depends(get_current_user)):
    sb = get_supabase()
    img_res = (
        scope_query(sb.table("images").select("id").eq("id", image_id), auth).execute()
    )
    if not img_res.data:
        raise HTTPException(404, "Image not found")

    res = (
        sb.table("image_messages")
        .select("id, role, content, created_at")
        .eq("image_id", image_id)
        .order("created_at")
        .execute()
    )
    return res.data


@router.delete("/images/{image_id}")
async def delete_image(image_id: str, auth: AuthContext = Depends(get_current_user)):
    settings = get_settings()
    sb = get_supabase()
    img_res = (
        scope_query(
            sb.table("images").select("id, storage_path").eq("id", image_id), auth
        )
        .execute()
    )
    if not img_res.data:
        raise HTTPException(404, "Image not found")
    storage_path = img_res.data[0]["storage_path"]

    sb.table("image_messages").delete().eq("image_id", image_id).execute()
    sb.table("images").delete().eq("id", image_id).execute()
    try:
        sb.storage.from_(settings.supabase_images_bucket).remove([storage_path])
    except Exception:
        pass
    return {"status": "deleted"}


@router.post("/images/{image_id}/query")
async def query_image(
    image_id: str,
    body: ImageQueryRequest,
    auth: AuthContext = Depends(get_current_user),
):
    settings = get_settings()
    sb = get_supabase()

    img_res = (
        scope_query(
            sb.table("images").select("id, status, storage_path").eq("id", image_id), auth
        )
        .execute()
    )
    if not img_res.data:
        raise HTTPException(404, "Image not found")
    image = img_res.data[0]
    if image["status"] != "ready":
        raise HTTPException(409, "Image is not ready for querying yet")

    signed = sb.storage.from_(settings.supabase_images_bucket).create_signed_url(
        image["storage_path"], settings.image_signed_url_ttl_seconds
    )
    image_url = signed["signedURL"]

    sb.table("image_messages").insert(
        {
            "id": str(uuid.uuid4()),
            "image_id": image_id,
            "user_id": auth.user_id,
            "role": "user",
            "content": body.question,
        }
    ).execute()

    async def event_generator():
        answer_parts: list[str] = []
        async for delta in stream_vision_response(
            body.question, image_url, instructions=VISION_INSTRUCTIONS
        ):
            answer_parts.append(delta)
            yield {"event": "message", "data": json.dumps({"delta": delta})}

        sb.table("image_messages").insert(
            {
                "id": str(uuid.uuid4()),
                "image_id": image_id,
                "user_id": auth.user_id,
                "role": "assistant",
                "content": "".join(answer_parts),
            }
        ).execute()
        yield {"event": "message", "data": "[DONE]"}

    return EventSourceResponse(event_generator())
