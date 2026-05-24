import uuid
from datetime import date
from sqlalchemy import String, Text, Date, ForeignKey, func, DateTime, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base
from datetime import datetime


class SpecialDay(Base):
    __tablename__ = "special_days"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="Birthday")  # Birthday, Wedding, Anniversary, Engagement, Festival, Event, Memory, Custom
    is_recurring: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    custom_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    gift_ideas: Mapped[str | None] = mapped_column(Text, nullable=True)
    celebration_plans: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="special_days")
