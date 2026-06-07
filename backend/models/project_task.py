import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class ProjectTask(Base):
    __tablename__ = "project_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[str] = mapped_column(String(50), default="Medium")  # High, Medium, Low
    status: Mapped[str] = mapped_column(String(50), default="Pending")    # Pending, In Progress, Review, Completed
    progress: Mapped[int] = mapped_column(Integer, default=0)              # 0 to 100
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subtasks: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True) # [{"id": "...", "title": "...", "completed": false}]
    goal_type: Mapped[str] = mapped_column(String(20), default="project")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="project_tasks")
