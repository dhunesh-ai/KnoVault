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

_connect_args["ssl"] = _ssl_ctx
# Disable asyncpg prepared-statement cache (required for Neon pooler / PgBouncer)
_connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    _db_url,
    echo=False,
    # Conservative pool for Neon serverless pooler
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,        # Recycle connections every 5 min to avoid stale conns
    pool_pre_ping=True,      # Verify connection liveness before checkout
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

    if "special_days" in tables and "important_days" not in tables:
        connection.execute(text("ALTER TABLE special_days RENAME TO important_days"))
        print("[MIGRATION] Successfully renamed 'special_days' table to 'important_days' table.")
        tables.append("important_days")
        if "special_days" in tables:
            tables.remove("special_days")

    if "birthdays" in tables and "important_days" not in tables:
        connection.execute(text("ALTER TABLE birthdays RENAME TO important_days"))
        connection.execute(text("ALTER TABLE important_days RENAME COLUMN person_name TO title"))
        connection.execute(text("ALTER TABLE important_days RENAME COLUMN birth_date TO date"))
        print("[MIGRATION] Successfully migrated 'birthdays' table to 'important_days' table.")
        tables.append("important_days")
        if "birthdays" in tables:
            tables.remove("birthdays")

    if "important_days" in tables:
        # Ensure all columns exist
        try:
            connection.execute(text("ALTER TABLE important_days ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Birthday' NOT NULL"))
            connection.execute(text("ALTER TABLE important_days ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT TRUE NOT NULL"))
            connection.execute(text("ALTER TABLE important_days ADD COLUMN IF NOT EXISTS custom_type VARCHAR(100)"))
        except Exception as e:
            print(f"[MIGRATION] Warning ensuring columns: {e}")

    # ── Firebase columns migration ────────────────────────────────────
    if "users" in tables:
        try:
            connection.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128) UNIQUE"
            ))
            connection.execute(text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500)"
            ))
            print("[MIGRATION] ✅ Firebase columns verified on users table")
        except Exception as e:
            print(f"[MIGRATION] Warning ensuring Firebase columns: {e}")

    # ── Reminders columns migration ───────────────────────────────────
    if "reminders" in tables:
        try:
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS timing_label VARCHAR(100)"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS dose_index INTEGER"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS course_day INTEGER"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS notification_id VARCHAR(200)"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE NOT NULL"))
            connection.execute(text("ALTER TABLE reminders ADD COLUMN IF NOT EXISTS series_id VARCHAR(200)"))
            print("[MIGRATION] ✅ Reminders columns verified on reminders table")
        except Exception as e:
            print(f"[MIGRATION] Warning ensuring Reminders columns: {e}")


async def init_db():
    print("[DB] Connecting to Neon PostgreSQL...")
    async with engine.begin() as conn:
        from models import user, note, goal, daily_goal, project_task, reminder, important_day, ai_chat, otp  # noqa
        await conn.run_sync(run_migrations)
        await conn.run_sync(Base.metadata.create_all)
    print("[DB] All tables created / verified on Neon PostgreSQL")
