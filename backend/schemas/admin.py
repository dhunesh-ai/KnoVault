from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Any, Optional


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
    otp_code: Optional[str] = None


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_otp: bool = False
    admin_user: dict


class UserAdminResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_verified: bool
    is_blocked: bool
    block_reason: Optional[str] = None
    block_type: Optional[str] = None
    blocked_at: Optional[datetime] = None
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None
    last_platform: Optional[str] = None
    created_at: datetime
    
    # Metadata Counts
    storage_used_bytes: int = 0
    notes_count: int = 0
    goals_count: int = 0
    reminders_count: int = 0
    important_days_count: int = 0
    ai_chats_count: int = 0
    workspaces_count: int = 0


class BlockUserRequest(BaseModel):
    reason: str = Field(..., description="Reason for blocking: Spam, Abuse, Fake Account, Policy Violation, Security Issue, Other")
    block_type: str = Field("permanent", description="temporary or permanent")
    duration_days: Optional[int] = Field(None, description="Duration in days if temporary")


class CreateAdminRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = Field("admin", description="super_admin, admin, support_admin, moderator")


class AnnouncementRequest(BaseModel):
    title: str
    message: str
    category: str = Field("app_update", description="app_update, maintenance, feature, emergency")
    target_audience: str = Field("everyone", description="everyone, mobile_only, web_only, selected_users")
    selected_user_ids: Optional[list[int]] = None


class SystemSettingRequest(BaseModel):
    key: str
    value: str
    description: Optional[str] = None


class DashboardStatsResponse(BaseModel):
    users: dict
    content: dict
    ai: dict
    system: dict


class AIStatsResponse(BaseModel):
    total_conversations: int
    total_messages: int
    total_tokens_today: int
    avg_response_time_ms: float
    failed_requests: int
    current_model: str
    features_breakdown: dict
