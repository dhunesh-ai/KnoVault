import uuid
from datetime import datetime
from pydantic import BaseModel


class AIChatRequest(BaseModel):
    message: str
    context: str | None = None
    system_prompt: str | None = None
    is_temporary: bool = False


class AIChatResponse(BaseModel):
    id: int
    message: str
    response: str
    created_at: datetime

    class Config:
        from_attributes = True


class AIChatHistoryResponse(BaseModel):
    chats: list[AIChatResponse]
    total: int
