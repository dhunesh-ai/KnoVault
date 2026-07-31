import datetime
from sqlalchemy import String, DateTime, Text, Integer, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_name: Mapped[str] = mapped_column(String(100), nullable=False)
    admin_email: Mapped[str] = mapped_column(String(255), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)  # BLOCK_USER, DELETE_USER, RESTORE_USER, etc.
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)  # USER, SYSTEM, ANNOUNCEMENT, SETTINGS
    target_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON or text description
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=func.now())


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="app_update")  # app_update, maintenance, feature, emergency
    target_audience: Mapped[str] = mapped_column(String(50), default="everyone")  # everyone, mobile_only, web_only, selected_users
    selected_user_ids: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string of user IDs
    created_by_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=True)
    sent_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=func.now())
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=func.now())


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_by_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=func.now(), onupdate=func.now())


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    user_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)  # login_success, login_failed, password_reset, suspicious
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    platform: Mapped[str | None] = mapped_column(String(50), nullable=True)  # web, mobile
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), default=func.now())
