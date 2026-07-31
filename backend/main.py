from contextlib import asynccontextmanager
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

import database.connection as db_conn
from database.connection import init_db
from config import get_settings
from routers import (
    auth_router, notes_router, goals_router, projects_router,
    reminders_router, birthdays_router, special_days_router, important_days_router,
    ai_chat_router, profile_router, backup_router, calendar_router,
    notifications_router, sync_router, files_router, calendar_notes_router,
    workspaces_router, secure_notes_router, scheduled_emails_router, admin_router
)
from utils.firebase import initialize_firebase

settings = get_settings()

# ENV CHECK LOGS
print(f"======================================")
print(f"[ENV CHECK] KEY EXISTS: {bool(settings.GROQ_API_KEY)}")
print(f"[ENV CHECK] MODEL: {settings.GROQ_MODEL}")
print(f"[ENV CHECK] DB_URL: {settings.DATABASE_URL[:20]}...")
print(f"======================================")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    os.makedirs("uploads/voice", exist_ok=True)
    os.makedirs("uploads/images", exist_ok=True)
    os.makedirs("uploads/documents", exist_ok=True)
    # Initialize Firebase Admin SDK
    initialize_firebase()
    
    # Start auto email wishes background scheduler
    from services.email_scheduler import auto_email_wishes_scheduler
    from services.notification_scheduler import auto_workspace_reminders_scheduler
    import asyncio
    scheduler_task = asyncio.create_task(auto_email_wishes_scheduler())
    ws_scheduler_task = asyncio.create_task(auto_workspace_reminders_scheduler())
    
    yield
    
    # Cancel the scheduler on shutdown
    scheduler_task.cancel()
    ws_scheduler_task.cancel()


app = FastAPI(
    title="KnoVault API",
    description="AI-Powered Productivity Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
raw_origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else []
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://knovault-jbph.onrender.com",
    "https://knovault.app",
    "https://kno-vault.vercel.app",
]
configured_origins = [o.strip() for o in raw_origins if o.strip() and o.strip() != "*"]
origins = list(set(default_origins + configured_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(goals_router)
app.include_router(projects_router)
app.include_router(reminders_router)
app.include_router(important_days_router, prefix="/api/important-days")
app.include_router(special_days_router, prefix="/api/special-days")
app.include_router(birthdays_router, prefix="/api/birthdays")
app.include_router(ai_chat_router)
app.include_router(profile_router)
app.include_router(backup_router)
app.include_router(calendar_router)
app.include_router(calendar_notes_router)
app.include_router(notifications_router)
app.include_router(sync_router)
app.include_router(files_router)
app.include_router(workspaces_router)
app.include_router(secure_notes_router)
app.include_router(scheduled_emails_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"message": "KnoVault API v1.0.0", "status": "running"}


@app.get("/health")
async def health():
    try:
        async with db_conn.engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        db_type = "sqlite" if "sqlite" in str(db_conn.engine.url) else "postgresql"
        return {"status": "healthy", "database": "connected", "database_type": db_type}
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "disconnected", "error": str(e)})
