import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from config import get_settings

settings = get_settings()

# ---------------------------------------------------------------------------
# Neon PostgreSQL connection configuration
# ---------------------------------------------------------------------------
# Neon's connection pooler (PgBouncer in transaction mode) requires:
#   1. SSL enabled
#   2. statement_cache_size=0 for asyncpg (prepared statements are incompatible
#      with PgBouncer transaction-mode pooling)
#   3. Conservative pool sizes — Neon pooler already handles connection reuse
# ---------------------------------------------------------------------------

# Build connect_args for asyncpg SSL support
_connect_args: dict = {}
_db_url = settings.DATABASE_URL

# Ensure the URL uses the asyncpg driver
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Configure SSL context for Neon
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE  # Neon manages certs; disable local verification

if "sqlite" in _db_url:
    engine = create_async_engine(
        _db_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    # Ensure ssl=require is in URL or passed natively for asyncpg
    if "sslmode=" not in _db_url and "ssl=" not in _db_url:
        _db_url = _db_url + ("&ssl=require" if "?" in _db_url else "?ssl=require")
    
    _connect_args["ssl"] = _ssl_ctx
    _connect_args["statement_cache_size"] = 0
    _connect_args["prepared_statement_name_func"] = lambda: None
    _connect_args["timeout"] = 30
    _connect_args["command_timeout"] = 30
    engine = create_async_engine(
        _db_url,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_timeout=30,
        pool_recycle=300,
        pool_pre_ping=True,
        connect_args=_connect_args,
    )

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def run_migrations(connection):
    from sqlalchemy import inspect, text
    inspector = inspect(connection)
    tables = inspector.get_table_names()

    # 1. Handle special_days / birthdays rename safely
    if "important_days" not in tables:
        if "special_days" in tables:
            connection.execute(text("ALTER TABLE special_days RENAME TO important_days"))
            tables.append("important_days")
            tables.remove("special_days")
        elif "birthdays" in tables:
            connection.execute(text("ALTER TABLE birthdays RENAME TO important_days"))
            connection.execute(text("ALTER TABLE important_days RENAME COLUMN person_name TO title"))
            connection.execute(text("ALTER TABLE important_days RENAME COLUMN birth_date TO date"))
            tables.append("important_days")
            tables.remove("birthdays")

    if "important_days" in tables:
        imp_cols = [c["name"] for c in inspector.get_columns("important_days")]
        if "type" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN type VARCHAR(50) DEFAULT 'Birthday' NOT NULL"))
        if "is_recurring" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN is_recurring BOOLEAN DEFAULT TRUE NOT NULL"))
        if "custom_type" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN custom_type VARCHAR(100)"))
        if "timezone" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'"))
        if "email_status" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN email_status VARCHAR(20) DEFAULT 'PENDING'"))
        if "email_retry_count" not in imp_cols:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN email_retry_count INTEGER DEFAULT 0 NOT NULL"))

    # 2. Firebase & Admin columns on users
    if "users" in tables:
        user_cols = [c["name"] for c in inspector.get_columns("users")]
        if "firebase_uid" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) UNIQUE"))
        if "fcm_token" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN fcm_token VARCHAR(500)"))
        if "role" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user' NOT NULL"))
        if "is_blocked" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE NOT NULL"))
        if "block_reason" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN block_reason VARCHAR(255)"))
        if "block_type" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN block_type VARCHAR(50)"))
        if "blocked_at" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN blocked_at TIMESTAMP WITH TIME ZONE"))
        if "is_deleted" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE NOT NULL"))
        if "deleted_at" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE"))
        if "last_login_at" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP WITH TIME ZONE"))
        if "last_active_at" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE"))
        if "last_platform" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN last_platform VARCHAR(50)"))
        if "totp_secret" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(255)"))
        if "totp_enabled" not in user_cols:
            connection.execute(text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT FALSE NOT NULL"))

    # 3. Reminders columns
    if "reminders" in tables:
        rem_cols = [c["name"] for c in inspector.get_columns("reminders")]
        if "start_date" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN start_date TIMESTAMP WITH TIME ZONE"))
        if "end_date" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN end_date TIMESTAMP WITH TIME ZONE"))
        if "timing_label" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN timing_label VARCHAR(100)"))
        if "dose_index" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN dose_index INTEGER"))
        if "course_day" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN course_day INTEGER"))
        if "notification_id" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN notification_id VARCHAR(200)"))
        if "is_completed" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN is_completed BOOLEAN DEFAULT FALSE NOT NULL"))
        if "series_id" not in rem_cols:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN series_id VARCHAR(200)"))

    # 4. Notifications index
    if "notifications" in tables:
        notif_cols = [c["name"] for c in inspector.get_columns("notifications")]
        if "related_item_id" in notif_cols:
            connection.execute(text("""
                DELETE FROM notifications 
                WHERE id NOT IN (
                    SELECT MIN(id) 
                    FROM notifications 
                    GROUP BY user_id, CASE WHEN related_item_id IS NULL THEN CAST(id AS VARCHAR) ELSE related_item_id END
                )
            """))
            connection.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_related "
                "ON notifications (user_id, related_item_id) WHERE related_item_id IS NOT NULL"
            ))


async def init_db():
    global engine, async_session
    print(f"[DB] Initializing database connection...")
    try:
        async with engine.begin() as conn:
            from models import user, note, goal, daily_goal, project_task, reminder, important_day, ai_chat, otp, workspace, notification, secure_note_security, support, scheduled_email, admin  # noqa
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(run_migrations)
        print("[DB] All tables created / verified successfully on primary database.")
    except Exception as e:
        import traceback
        err_type = type(e).__name__
        err_msg = str(e) if str(e) else repr(e)
        print(f"[DB ERROR] Primary DB connection failed ({err_type}): {err_msg}")
        print(f"[DB ERROR DETAILS]\n{traceback.format_exc().strip()}")
        allow_fallback = getattr(settings, "ALLOW_SQLITE_FALLBACK", False) or os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() == "true"
        if allow_fallback:
            print("[DB FALLBACK] Explicit fallback allowed. Switching to local SQLite database...")
            fallback_url = "sqlite+aiosqlite:///./knovault.db"
            try:
                engine = create_async_engine(fallback_url, echo=False, connect_args={"check_same_thread": False})
                async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
                async with engine.begin() as conn:
                    from models import user, note, goal, daily_goal, project_task, reminder, important_day, ai_chat, otp, workspace, notification, secure_note_security, support, scheduled_email  # noqa
                    await conn.run_sync(Base.metadata.create_all)
                    await conn.run_sync(run_migrations)
                print("[DB FALLBACK] SQLite fallback database initialized successfully!")
            except Exception as fb_err:
                print(f"[DB FALLBACK ERROR] SQLite fallback failed ({type(fb_err).__name__}): {fb_err}")
                print(f"[DB FALLBACK ERROR TRACEBACK]\n{traceback.format_exc().strip()}")
                raise e
        else:
            raise e

