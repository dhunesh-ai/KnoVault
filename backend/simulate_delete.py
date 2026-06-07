import asyncio
import json
from sqlalchemy import text
from database.connection import engine, async_session
from models.reminder import Reminder
import datetime

async def test_soft_delete():
    print("--- BEFORE CREATE ---")
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = TRUE"))
        print(f"Deleted count: {res.scalar()}")
        
    print("\n--- CREATE ---")
    # 1. Create a reminder
    test_id = None
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
        print(f"Created test reminder with ID: {test_id}")
        
    # Verify state
    async with engine.connect() as conn:
        res = await conn.execute(text(f"SELECT id, title, is_deleted FROM reminders WHERE id = {test_id}"))
        print(f"Record created: {dict(res.fetchone()._mapping)}")

    print("\n--- SIMULATE FASTAPI DELETE (Soft Delete) ---")
    # Simulate exact logic of delete_reminder
    async with async_session() as session:
        # FastAPI Depends(get_db) enters here
        from sqlalchemy import select
        result = await session.execute(
            select(Reminder).where(Reminder.id == test_id, Reminder.user_id == user_id)
        )
        reminder = result.scalar_one_or_none()
        
        # logic
        reminder.is_deleted = True
        
        # FastAPI Depends(get_db) exits here and does commit
        await session.commit()

    print("\n--- AFTER SOFT DELETE ---")
    async with engine.connect() as conn:
        res = await conn.execute(text(f"SELECT id, title, is_deleted FROM reminders WHERE id = {test_id}"))
        print(f"Record after delete: {dict(res.fetchone()._mapping)}")
        
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = TRUE"))
        print(f"Deleted count: {res.scalar()}")

asyncio.run(test_soft_delete())
