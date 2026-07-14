from datetime import datetime

from pydantic import BaseModel


class CodeConversation(BaseModel):
    id: str
    title: str
    created_at: datetime | None = None


class CodeMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime | None = None


class CodeFile(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime | None = None


class UploadUrlRequest(BaseModel):
    filename: str


class UploadUrlResponse(BaseModel):
    file_id: str
    upload_url: str
    storage_path: str


class SendCodeMessageRequest(BaseModel):
    conversation_id: str
    message: str
