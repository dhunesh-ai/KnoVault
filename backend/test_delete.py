import asyncio
from sqlalchemy import select, delete
from database.connection import async_session
from models.reminder import Reminder

async def test_delete():
    async with async_session() as session:
        # Find ID 1
        res = await session.execute(select(Reminder).where(Reminder.id == 1))
        rem = res.scalar_one_or_none()
        if rem:
            print("Found reminder 1. Deleting...")
            await session.delete(rem)
            await session.commit()
            print("Deleted and committed.")
        else:
            print("Reminder 1 not found.")

        # Find ID 81
        res = await session.execute(select(Reminder).where(Reminder.id == 81))
        rem = res.scalar_one_or_none()
        if rem:
            print("Found reminder 81. Deleting...")
            await session.delete(rem)
            await session.commit()
            print("Deleted and committed.")
        else:
            print("Reminder 81 not found.")

asyncio.run(test_delete())
