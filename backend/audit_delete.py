import asyncio
import json
from sqlalchemy import text
from database.connection import engine, async_session
from models.reminder import Reminder
import datetime

async def run_audit():
    async with engine.connect() as conn:
        print("--- BEFORE TEST DB COUNTS ---")
        total = await conn.execute(text("SELECT COUNT(*) FROM reminders"))
        active = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = FALSE"))
        deleted = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = TRUE"))
        print(f"Total: {total.scalar()}, Active: {active.scalar()}, Deleted: {deleted.scalar()}")

    # 1. Create a reminder
    async with async_session() as session:
        # Assuming user 1 exists
        res = await session.execute(text("SELECT id FROM users LIMIT 1"))
        user_id = res.scalar() or 1
        
        rem = Reminder(
            user_id=user_id,
            title="Soft Delete Test",
            type="reminder",
            reminder_date=datetime.datetime.now(),
            is_deleted=False
        )
        session.add(rem)
        await session.commit()
        await session.refresh(rem)
        test_id = rem.id
        print(f"\nCreated test reminder with ID: {test_id}")

    # 2. Trigger the delete endpoint directly
    import httpx
    # We will simulate the delete by calling the API using httpx to see exactly what the endpoint does
    # First, let's get a token. We can bypass auth for the sake of the DB layer test by just executing the function logic,
    # OR we can just hit the python logic exactly as it is in the router.
    # Let's execute the router logic manually to see what happens.
    
    async with async_session() as session:
        # Fetch it
        res = await session.execute(text(f"SELECT * FROM reminders WHERE id = {test_id}"))
        rem_data = dict(res.fetchone()._mapping)
        print("\nBefore Delete Record State:")
        print(rem_data)

        # Simulate router's soft delete logic
        from routers.reminders import delete_reminder
        # We can't easily call FastAPI dependencies, so we will replicate exactly what delete_reminder does currently:
        # Let's inspect the current code in routers/reminders.py to see what it does.

asyncio.run(run_audit())
