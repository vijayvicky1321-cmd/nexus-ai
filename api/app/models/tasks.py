from datetime import datetime

from pydantic import BaseModel


class Task(BaseModel):
    id: str
    title: str
    description: str | None = None
    due_date: datetime | None = None
    is_done: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CreateTaskRequest(BaseModel):
    title: str
    description: str | None = None
    due_date: datetime | None = None


class UpdateTaskRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    is_done: bool | None = None
