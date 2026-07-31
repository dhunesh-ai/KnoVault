import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class AIChat(Base):
    __tablename__ = "ai_chats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ai_chats")


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"conv_{uuid.uuid4().hex[:16]}")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New Conversation")
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="ai_conversations")
    messages = relationship("AIConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="AIConversationMessage.created_at.asc()")


class AIConversationMessage(Base):
    __tablename__ = "ai_conversation_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:16]}")
    conversation_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("AIConversation", back_populates="messages")
    user = relationship("User")
