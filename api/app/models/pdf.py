from datetime import datetime

from pydantic import BaseModel


class PdfDocument(BaseModel):
    id: str
    filename: str
    status: str
    created_at: datetime | None = None


class UploadUrlRequest(BaseModel):
    filename: str


class UploadUrlResponse(BaseModel):
    document_id: str
    upload_url: str
    storage_path: str


class QueryRequest(BaseModel):
    question: str


class Citation(BaseModel):
    chunk_index: int
    chunk_text: str
