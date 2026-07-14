from datetime import datetime

from pydantic import BaseModel


class ImageRecord(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime | None = None


class ImageUploadUrlRequest(BaseModel):
    filename: str


class ImageUploadUrlResponse(BaseModel):
    image_id: str
    upload_url: str
    storage_path: str


class ImageQueryRequest(BaseModel):
    question: str


class ImageMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime | None = None
