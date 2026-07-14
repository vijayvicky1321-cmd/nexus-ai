from datetime import datetime
from typing import Literal

from pydantic import BaseModel

EmailMode = Literal["reply", "compose"]


class EmailDraft(BaseModel):
    id: str
    mode: EmailMode
    input_context: str | None = None
    tone: str | None = None
    generated_subject: str | None = None
    generated_body: str | None = None
    created_at: datetime | None = None


class GenerateEmailRequest(BaseModel):
    mode: EmailMode
    input_context: str
    tone: str | None = None


class CreateEmailDraftRequest(BaseModel):
    mode: EmailMode
    input_context: str | None = None
    tone: str | None = None
    generated_subject: str | None = None
    generated_body: str | None = None
