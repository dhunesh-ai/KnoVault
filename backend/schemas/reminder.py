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
    is_completed: bool | None = None
    notification_id: str | None = None


class ReminderResponse(BaseModel):
    id: int
    title: str
    description: str | None = None
    type: str
    custom_type: str | None = None
    reminder_date: datetime
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None
    is_deleted: bool = False
    
    # Medication course fields
    start_date: datetime | None = None
    end_date: datetime | None = None
    timing_label: str | None = None
    dose_index: int | None = None
    course_day: int | None = None
    notification_id: str | None = None
    is_completed: bool = False
    series_id: str | None = None

    class Config:
        from_attributes = True
