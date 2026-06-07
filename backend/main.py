from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database.connection import engine, init_db
from config import get_settings
from routers import (
    auth_router, notes_router, goals_router, projects_router,
    reminders_router, birthdays_router, special_days_router, important_days_router,
    ai_chat_router, profile_router, backup_router, calendar_router,
    notifications_router, sync_router
)
from utils.firebase import initialize_firebase

import os

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
    # Initialize Firebase Admin SDK
    initialize_firebase()
    yield


app = FastAPI(
    title="KnoVault API",
    description="AI-Powered Productivity Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(notifications_router)
app.include_router(sync_router)


from sqlalchemy import text
from fastapi import HTTPException

@app.get("/")
async def root():
    return {"message": "KnoVault API v1.0.0", "status": "running"}


@app.get("/health")
async def health():
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail={"status": "unhealthy", "database": "disconnected", "error": str(e)})
