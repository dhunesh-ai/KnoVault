import uuid
from datetime import datetime
from pydantic import BaseModel


class GoalCreate(BaseModel):
    title: str


class GoalUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None


class GoalResponse(BaseModel):
    id: int
    title: str
    completed: bool
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
