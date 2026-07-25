from datetime import datetime, date
from pydantic import BaseModel


class DailyGoalCreate(BaseModel):
    title: str
    goal_date: date | None = None
    daily_target: int = 1
    target_unit: str = "times"
    start_date: date | None = None
    reminder_time: str | None = None
    repeat_schedule: str | None = "daily"
    priority: str | None = "Medium"
    difficulty: str | None = "medium"
    color: str | None = "#6D4CFF"
    icon: str | None = "🎯"
    notes: str | None = None
    goal_type: str = "daily_goal"


class DailyGoalUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None
    goal_date: date | None = None
    daily_target: int | None = None
    target_unit: str | None = None
    start_date: date | None = None
    reminder_time: str | None = None
    repeat_schedule: str | None = None
    priority: str | None = None
    difficulty: str | None = None
    color: str | None = None
    icon: str | None = None
    notes: str | None = None


class DailyGoalResponse(BaseModel):
    id: int
    title: str
    completed: bool
    goal_date: date
    daily_target: int
    target_unit: str
    start_date: date
    reminder_time: str | None = None
    repeat_schedule: str | None = "daily"
    priority: str | None = "Medium"
    difficulty: str | None = "medium"
    color: str | None = "#6D4CFF"
    icon: str | None = "🎯"
    notes: str | None = None
    goal_type: str
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True

