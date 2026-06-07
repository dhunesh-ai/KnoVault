from datetime import datetime
from pydantic import BaseModel, Field


class SubTask(BaseModel):
    id: str | int
    title: str
    completed: bool = False


class ProjectTaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "Pending"
    progress: int = 0
    deadline: datetime | None = None
    subtasks: list[SubTask] = Field(default_factory=list)


class ProjectTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    completed: bool | None = None
    priority: str | None = None
    status: str | None = None
    progress: int | None = None
    deadline: datetime | None = None
    subtasks: list[SubTask] | None = None


class ProjectTaskResponse(BaseModel):
    id: int
    title: str
    description: str | None
    completed: bool
    priority: str
    status: str
    progress: int
    deadline: datetime | None
    subtasks: list[SubTask] | None
    goal_type: str
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True
