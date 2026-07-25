from datetime import datetime, date
from sqlalchemy import String, Boolean, DateTime, Date, ForeignKey, func, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class DailyGoal(Base):
    __tablename__ = "daily_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    goal_date: Mapped[date] = mapped_column(Date, server_default=func.current_date(), nullable=False)
    daily_target: Mapped[int] = mapped_column(Integer, default=1)
    target_unit: Mapped[str] = mapped_column(String(50), default='times')
    start_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    reminder_time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    goal_type: Mapped[str] = mapped_column(String(20), default="daily_goal")
    repeat_schedule: Mapped[str | None] = mapped_column(String(50), default="daily", nullable=True)
    priority: Mapped[str | None] = mapped_column(String(20), default="Medium", nullable=True)
    difficulty: Mapped[str | None] = mapped_column(String(20), default="medium", nullable=True)
    color: Mapped[str | None] = mapped_column(String(20), default="#6D4CFF", nullable=True)
    icon: Mapped[str | None] = mapped_column(String(20), default="🎯", nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="daily_goals")

