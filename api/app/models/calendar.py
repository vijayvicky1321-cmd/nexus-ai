from datetime import datetime

from pydantic import BaseModel


class Event(BaseModel):
    id: str
    title: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None
    created_at: datetime | None = None


class CreateEventRequest(BaseModel):
    title: str
    description: str | None = None
    starts_at: datetime
    ends_at: datetime | None = None


class UpdateEventRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
