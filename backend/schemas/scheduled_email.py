from datetime import datetime
from pydantic import BaseModel

class ScheduledEmailResponse(BaseModel):
    id: int
    recipient_email: str
    subject: str
    body: str
    send_datetime: datetime
    timezone: str
    status: str
    error_message: str | None = None
    retry_count: int
    sent_at: datetime | None = None
    created_at: datetime
    important_day_id: int | None = None
    user_id: int

    class Config:
        from_attributes = True
