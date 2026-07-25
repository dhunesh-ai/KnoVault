import uuid
from datetime import date
from sqlalchemy import String, Text, Date, ForeignKey, func, DateTime, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base
from datetime import datetime


class ImportantDay(Base):
    __tablename__ = "important_days"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="Birthday")  # Birthday, Wedding Anniversary, Engagement, Festival, Meeting, Achievement, Personal Memory, Custom Event
    is_recurring: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    custom_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    gift_ideas: Mapped[str | None] = mapped_column(Text, nullable=True)
    celebration_plans: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_draft: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Email wish fields
    recipient_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email_subject: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    email_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    delivery_type: Mapped[str] = mapped_column(String(20), nullable=False, default="notification")  # notification, email, both
    send_time: Mapped[str | None] = mapped_column(String(10), nullable=True, default="09:00")  # HH:MM format
    
    # New Auto Email Wishes fields
    auto_send_email: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    email_send_time: Mapped[str | None] = mapped_column(String(10), nullable=True, default="09:00")
    last_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_sent_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(50), nullable=True, default="UTC")
    email_status: Mapped[str | None] = mapped_column(String(20), nullable=True, default="PENDING")
    email_retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Reminders JSON (stored as serialized JSON array)
    reminders_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Smart Reminder System fields
    reminder_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    reminder_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reminder_value: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reminder_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reminder_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # Extended planning & event fields
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    event_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    favorite_color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    checklist: Mapped[str | None] = mapped_column(Text, nullable=True)
    budget: Mapped[str | None] = mapped_column(String(100), nullable=True)
    links: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachments: Mapped[str | None] = mapped_column(Text, nullable=True)

    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship("User", back_populates="important_days")
