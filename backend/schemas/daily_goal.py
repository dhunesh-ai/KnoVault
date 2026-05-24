from datetime import datetime, date
from pydantic import BaseModel


class DailyGoalCreate(BaseModel):
    title: str
    goal_date: date | None = None


class DailyGoalUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None
    goal_date: date | None = None


class DailyGoalResponse(BaseModel):
    id: int
    title: str
    completed: bool
    goal_date: date
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True
