import asyncio
import json
from sqlalchemy import text
from database.connection import engine

async def verify_db():
    async with engine.connect() as conn:
        print("--- GHOST REMINDERS ---")
        ghosts = await conn.execute(text("SELECT id, title, is_deleted FROM reminders WHERE title LIKE '%Mahe Anne meeting%' OR title LIKE '%Water Reminder%'"))
        for g in ghosts.fetchall():
            print(dict(g._mapping))
            
        print("\n--- DATABASE STATISTICS ---")
        stats = {}
        
        # Total reminders
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders"))
        stats['total'] = res.scalar()
        
        # Deleted reminders
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = True"))
        stats['deleted'] = res.scalar()
        
        # Active reminders
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_deleted = False"))
        stats['active'] = res.scalar()
        
        # Medicine reminders
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE type = 'medicine'"))
        stats['medicine'] = res.scalar()
        
        # Completed reminders
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_completed = True"))
        stats['completed'] = res.scalar()
        
        # Overdue reminders (assuming active, not completed, date < now)
        res = await conn.execute(text("SELECT COUNT(*) FROM reminders WHERE is_completed = False AND is_deleted = False AND reminder_date < CURRENT_TIMESTAMP"))
        stats['overdue'] = res.scalar()

        print(json.dumps(stats, indent=2))

asyncio.run(verify_db())
