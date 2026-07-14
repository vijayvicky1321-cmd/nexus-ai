from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Note(BaseModel):
    id: str
    title: str
    content: str
    updated_at: datetime | None = None


class CreateNoteRequest(BaseModel):
    pass


class UpdateNoteRequest(BaseModel):
    title: str | None = None
    content: str | None = None


class NoteAIActionRequest(BaseModel):
    action: Literal["summarize", "improve", "expand"]
