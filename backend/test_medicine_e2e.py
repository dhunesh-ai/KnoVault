import asyncio
import json
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from database.connection import engine, async_session
from models.reminder import Reminder
from models.user import User

async def end_to_end_test():
    print("=== KnoVault Medicine E2E Test ===")
    
    async with async_session() as session:
        res = await session.execute(text("SELECT id FROM users LIMIT 1"))
        user_id = res.scalar() or 1
        user = User(id=user_id)
        
        # TEST 1 & 2: MEDICINE CREATION & DOSE GENERATION
        print("\n--- 1. MEDICINE CREATION & 2. DOSE GENERATION ---")
        tomorrow = datetime.now() + timedelta(days=1)
        start_date = tomorrow.replace(hour=8, minute=0, second=0, microsecond=0)
        
        desc = {
            "isMedicine": True,
            "medName": "Audit Tablet",
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
        
        from routers.reminders import generate_medicine_reminders
        first_rem = await generate_medicine_reminders(
            session, user, "Audit Tablet", json.dumps(desc), start_date, None
        )
        series_id = first_rem.series_id
        await session.commit()
        
        res = await session.execute(text(
            f"SELECT id, title, timing_label, reminder_date, is_completed, is_deleted "
            f"FROM reminders WHERE series_id = '{series_id}' ORDER BY reminder_date"
        ))
        doses = res.fetchall()
        print(f"Total Doses Generated: {len(doses)} (Expected 10)")
        for d in doses:
            d_dict = dict(d._mapping)
            print(d_dict)
            
        # TEST 4: MEDICINE EDIT TEST
        print("\n--- 4. MEDICINE EDIT TEST ---")
        # Complete the first dose
        first_dose_id = doses[0].id
        await session.execute(text(f"UPDATE reminders SET is_completed = TRUE WHERE id = {first_dose_id}"))
        await session.commit()
        print(f"Marked Dose {first_dose_id} as Completed.")
        
        # Now update the medicine (Simulate PUT request)
        desc["timing_times"]["Breakfast 🍳"] = "09:00 AM" # Change breakfast to 9 AM
        
        # The update_reminder logic calls delete then regenerate
        from sqlalchemy import update
        update_stmt = update(Reminder).where(
            Reminder.user_id == user_id,
            ((Reminder.series_id == series_id) | Reminder.description.like(f'%"series_id": "{series_id}"%')),
            Reminder.is_completed == False
        ).values(is_deleted=True)
        await session.execute(update_stmt)
        await session.commit()
        
        await generate_medicine_reminders(
            session, user, "Audit Tablet", json.dumps(desc), start_date, None, old_series_id=series_id
        )
        await session.commit()
        
        res = await session.execute(text(
            f"SELECT id, title, timing_label, reminder_date, is_completed, is_deleted "
            f"FROM reminders WHERE series_id = '{series_id}' ORDER BY reminder_date"
        ))
        edited_doses = res.fetchall()
        print("Doses after Edit (Should have preserved Day 1 Breakfast, and regenerated rest with 9 AM):")
        for d in edited_doses:
            print(dict(d._mapping))
            
        # TEST 5: MEDICINE DELETE TEST
        print("\n--- 5. MEDICINE DELETE TEST ---")
        update_stmt = update(Reminder).where(
            Reminder.user_id == user_id,
            ((Reminder.series_id == series_id) | Reminder.description.like(f'%"series_id": "{series_id}"%')),
            Reminder.is_completed == False
        ).values(is_deleted=True)
        await session.execute(update_stmt)
        await session.commit()
        
        res = await session.execute(text(
            f"SELECT id, title, timing_label, reminder_date, is_completed, is_deleted "
            f"FROM reminders WHERE series_id = '{series_id}' ORDER BY reminder_date"
        ))
        deleted_doses = res.fetchall()
        print("Doses after Delete:")
        for d in deleted_doses:
            print(dict(d._mapping))
            
        print("\n=== INTEGRITY CHECK ===")
        orphans = await session.execute(text("SELECT COUNT(*) FROM reminders WHERE series_id IS NOT NULL AND type != 'medicine'"))
        print(f"Orphan Reminders: {orphans.scalar()}")

asyncio.run(end_to_end_test())
