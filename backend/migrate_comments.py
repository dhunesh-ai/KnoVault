import asyncio
from sqlalchemy import text
from database.connection import engine

async def run_migration():
    tables = [
        "workspace_goals",
        "workspace_discussions",
        "workspace_knowledge",
        "workspace_meetings",
        "workspace_ideas",
        "workspace_events"
    ]
    async with engine.begin() as conn:
        print("Starting comments column migration...")
        for table in tables:
            try:
                # In SQLite, "ADD COLUMN" is supported. "IF NOT EXISTS" is not standard in SQLite ALTER TABLE,
                # but we can try executing it or catch exception if column already exists.
                # To be safe, we can try to add the column and ignore errors if it already exists.
                print(f"Adding comments column to {table}...")
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN comments JSON"))
                print(f"Successfully added comments to {table}")
            except Exception as e:
                # If column already exists, SQLite raises OperationalError
                print(f"Note: Column may already exist or table may not exist in database yet: {e}")
        print("Migration finished successfully.")

if __name__ == "__main__":
    asyncio.run(run_migration())
