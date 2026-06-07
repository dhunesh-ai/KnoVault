import asyncio
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from database.connection import engine, async_session
from models.reminder import Reminder

async def test_generation():
    async with async_session() as session:
        # Assuming user 1 exists
        res = await session.execute(text("SELECT id FROM users LIMIT 1"))
        user_id = res.scalar() or 1
        
        # Test parameters
        tomorrow = datetime.now() + timedelta(days=1)
        # We need a start_date object (e.g., 08:00 AM tomorrow for base reference, though time doesn't matter for start_date base)
        start_date = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
        
        desc = {
            "isMedicine": True,
            "medName": "Tablet",
            "medType": "Tablet 💊",
            "dosage": "1 tablet",
            "foodTiming": "After Food",
            "frequency": "Daily",
            "duration": "5 days",
            "timings": ["Breakfast 🍳", "Dinner 🍲"],
            "timing_times": {
                "Breakfast 🍳": "08:00 AM",
                "Dinner 🍲": "08:00 PM"
            }
        }
        
        # We simulate the exact call to generate_medicine_reminders
        from routers.reminders import generate_medicine_reminders
        from models.user import User
        
        # Mock user object
        user = User(id=user_id)
        
        # Run generation
        await generate_medicine_reminders(
            session, user, "Tablet", json.dumps(desc), start_date, None
        )
        
        await session.commit()
        
    # Verify records
    async with engine.connect() as conn:
        print("--- GENERATED DOSES ---")
        res = await conn.execute(text(
            f"SELECT id, title, timing_label, reminder_date, is_completed, is_deleted "
            f"FROM reminders WHERE type = 'medicine' AND title LIKE '%Tablet%' ORDER BY reminder_date"
        ))
        rows = res.fetchall()
        for r in rows:
            print(dict(r._mapping))
            
        print(f"\nTotal Reminders Generated: {len(rows)}")

asyncio.run(test_generation())
