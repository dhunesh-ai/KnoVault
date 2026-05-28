import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, func, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="custom")  # assignment, meeting, birthday, event, custom
    custom_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reminder_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Medication course & state metadata fields
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timing_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dose_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    course_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notification_id: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    series_id: Mapped[str | None] = mapped_column(String(200), nullable=True)

    user = relationship("User", back_populates="reminders")
