import uuid
from datetime import datetime
from pydantic import BaseModel


class AIConversationMessageSchema(BaseModel):
    id: str
    conversation_id: str
    user_id: int
    role: str  # "user" | "assistant"
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class AIConversationSummarySchema(BaseModel):
    id: str
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    last_message: str | None = None

    class Config:
        from_attributes = True


class AIConversationSchema(BaseModel):
    id: str
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    messages: list[AIConversationMessageSchema] = []

    class Config:
        from_attributes = True


class AIConversationCreate(BaseModel):
    id: str | None = None
    title: str | None = "New Conversation"


class AIConversationUpdate(BaseModel):
    title: str | None = None
    is_pinned: bool | None = None


class AIChatRequest(BaseModel):
    conversation_id: str | None = None
    message: str
    context: str | None = None
    system_prompt: str | None = None
    is_temporary: bool = False
    client_message_id: str | None = None


class AIChatResponse(BaseModel):
    id: str | int | None = None
    conversation_id: str
    message: str
    response: str
    title: str = "New Conversation"
    user_message: AIConversationMessageSchema | None = None
    assistant_message: AIConversationMessageSchema | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class AIChatHistoryResponse(BaseModel):
    chats: list[AIChatResponse]
    total: int
