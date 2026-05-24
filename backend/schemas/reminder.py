import uuid
from datetime import datetime
from pydantic import BaseModel


class ReminderCreate(BaseModel):
    title: str
    description: str | None = None
    type: str = "custom"
    custom_type: str | None = None
    reminder_date: datetime


class ReminderUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    custom_type: str | None = None
    reminder_date: datetime | None = None


class ReminderResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    type: str
    custom_type: str | None = None
    reminder_date: datetime
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
