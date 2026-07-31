from routers.auth import router as auth_router
from routers.notes import router as notes_router
from routers.goals import router as goals_router
from routers.projects import router as projects_router
from routers.reminders import router as reminders_router
from routers.important_days import router as important_days_router
from routers.ai_chat import router as ai_chat_router
from routers.profile import router as profile_router
from routers.backup import router as backup_router
from routers.calendar import router as calendar_router
from routers.notifications import router as notifications_router
from routers.files import router as files_router
from routers.calendar_notes import router as calendar_notes_router
from routers.workspaces import router as workspaces_router
from routers.secure_notes import router as secure_notes_router
from routers.scheduled_emails import router as scheduled_emails_router
from routers.admin import router as admin_router

from routers.sync import router as sync_router

special_days_router = important_days_router
birthdays_router = important_days_router

__all__ = [
    "auth_router", "notes_router", "goals_router", "projects_router",
    "reminders_router", "birthdays_router", "special_days_router", "important_days_router",
    "ai_chat_router", "profile_router", "backup_router", "calendar_router",
    "notifications_router", "sync_router", "files_router", "calendar_notes_router",
    "workspaces_router", "secure_notes_router", "scheduled_emails_router", "admin_router"
]

