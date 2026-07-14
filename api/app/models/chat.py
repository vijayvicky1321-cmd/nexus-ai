from datetime import datetime

from pydantic import BaseModel


class Conversation(BaseModel):
    id: str
    title: str
    created_at: datetime | None = None


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime | None = None


class SendMessageRequest(BaseModel):
    conversation_id: str
    message: str
