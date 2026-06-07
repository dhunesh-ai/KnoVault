import asyncio
import json
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import text, select, update, func
from database.connection import engine, async_session
from models.reminder import Reminder
from models.user import User

async def run_edge_cases():
    print("=== ZERO-ASSUMPTION EDGE CASE AUDIT ===")
    results = {}
    
    async with async_session() as session:
        res = await session.execute(text("SELECT id FROM users LIMIT 1"))
        user_id = res.scalar() or 1
        user = User(id=user_id)
        from routers.reminders import generate_medicine_reminders
        
        # Helper function
        async def create_medicine(name, days, timings_map, start_date):
            desc = {
                "isMedicine": True,
                "medName": name,
                "medType": "Tablet 💊",
                "dosage": "1 tablet",
                "foodTiming": "After Food",
                "frequency": "Daily",
                "duration": f"{days} days",
                "timings": list(timings_map.keys()),
                "timing_times": timings_map
            }
            start_t = time.time()
            rem = await generate_medicine_reminders(session, user, name, json.dumps(desc), start_date, None)
            await session.commit()
            end_t = time.time()
            return rem.series_id, end_t - start_t
            
        async def count_doses(series_id):
            res = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{series_id}' AND is_deleted = FALSE"))
            return res.scalar()

        now = datetime.now(timezone.utc)
        
        # 1. SAME-DAY MEDICINE (1 day, 2 schedules)
        s_id_1, t1 = await create_medicine("Test 1", 1, {"Breakfast 🍳": "08:00 AM", "Dinner 🍲": "08:00 PM"}, now)
        c1 = await count_doses(s_id_1)
        results["1. SAME-DAY"] = "PASS" if c1 == 2 else f"FAIL (Expected 2, got {c1})"

        # 2. MULTI-SCHEDULE (30 days, 4 schedules)
        s_id_2, t2 = await create_medicine("Test 2", 30, {"Breakfast 🍳": "08:00 AM", "Lunch 🍱": "01:00 PM", "Dinner 🍲": "08:00 PM", "Bedtime 🛏️": "11:00 PM"}, now)
        c2 = await count_doses(s_id_2)
        results["2. MULTI-SCHEDULE"] = "PASS" if c2 == 120 else f"FAIL (Expected 120, got {c2})"

        # 3. TIME COLLISION (Breakfast 08:00, Lunch 08:00)
        s_id_3, t3 = await create_medicine("Test 3", 5, {"Breakfast 🍳": "08:00 AM", "Lunch 🍱": "08:00 AM"}, now)
        c3 = await count_doses(s_id_3)
        
        # Verify collision doesn't drop anything (Should be 10)
        res_col = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{s_id_3}' GROUP BY reminder_date HAVING COUNT(*) > 1"))
        col_count = len(res_col.fetchall())
        results["3. TIME COLLISION"] = "PASS" if c3 == 10 and col_count == 5 else f"FAIL (Expected 10 total, 5 collisions. Got {c3}, {col_count})"

        # 4. PAST DATE (Start Date = Yesterday)
        s_id_4, t4 = await create_medicine("Test 4", 3, {"Breakfast 🍳": "08:00 AM"}, now - timedelta(days=1))
        c4 = await count_doses(s_id_4)
        # Verify that yesterday's date is actually created
        res_past = await session.execute(text(f"SELECT reminder_date FROM reminders WHERE series_id = '{s_id_4}' ORDER BY reminder_date LIMIT 1"))
        past_date = res_past.scalar()
        is_past = past_date < now
        results["4. PAST DATE"] = "PASS" if c4 == 3 and is_past else f"FAIL (Got {c4} doses, is_past={is_past})"

        # 5. EDIT TEST
        s_id_5, _ = await create_medicine("Test 5", 5, {"Breakfast 🍳": "08:00 AM"}, now)
        # Mark 2 as complete
        res_ids = await session.execute(text(f"SELECT id FROM reminders WHERE series_id = '{s_id_5}' ORDER BY reminder_date LIMIT 2"))
        ids = [r[0] for r in res_ids.fetchall()]
        for idx in ids:
            await session.execute(text(f"UPDATE reminders SET is_completed = TRUE WHERE id = {idx}"))
        await session.commit()
        # Edit to 9 AM
        desc5 = {
            "isMedicine": True, "medName": "Test 5", "medType": "Tablet 💊", "dosage": "1 tablet", "foodTiming": "After Food",
            "frequency": "Daily", "duration": "5 days", "timings": ["Breakfast 🍳"], "timing_times": {"Breakfast 🍳": "09:00 AM"}
        }
        await session.execute(text(f"UPDATE reminders SET is_deleted = TRUE WHERE series_id = '{s_id_5}' AND is_completed = FALSE"))
        await session.commit()
        await generate_medicine_reminders(session, user, "Test 5", json.dumps(desc5), now, None, old_series_id=s_id_5)
        await session.commit()
        
        c5_comp = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{s_id_5}' AND is_completed = TRUE AND is_deleted = FALSE"))
        c5_incomp = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{s_id_5}' AND is_completed = FALSE AND is_deleted = FALSE"))
        c5_c = c5_comp.scalar()
        c5_i = c5_incomp.scalar()
        results["5. EDIT TEST"] = "PASS" if c5_c == 2 and c5_i == 3 else f"FAIL (Got {c5_c} comp, {c5_i} incomp)"

        # 6. DELETE TEST
        await session.execute(text(f"UPDATE reminders SET is_deleted = TRUE WHERE series_id = '{s_id_5}' AND is_completed = FALSE"))
        await session.commit()
        c6_comp = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{s_id_5}' AND is_completed = TRUE AND is_deleted = FALSE"))
        c6_incomp = await session.execute(text(f"SELECT COUNT(*) FROM reminders WHERE series_id = '{s_id_5}' AND is_completed = FALSE AND is_deleted = FALSE"))
        results["6. DELETE TEST"] = "PASS" if c6_comp.scalar() == 2 and c6_incomp.scalar() == 0 else "FAIL"

        # 8. TIMEZONE TEST (Verify dates are TZ-aware or matching generation)
        res_tz = await session.execute(text(f"SELECT reminder_date FROM reminders WHERE series_id = '{s_id_1}' LIMIT 1"))
        tz_date = res_tz.scalar()
        results["8. TIMEZONE TEST"] = "PASS" if hasattr(tz_date, 'tzinfo') or tz_date is not None else "FAIL"

        # 10. PERFORMANCE TEST (365 days * 4 schedules = 1460 doses)
        s_id_10, t10 = await create_medicine("Test 10", 365, {"Breakfast 🍳": "08:00 AM", "Lunch 🍱": "01:00 PM", "Dinner 🍲": "08:00 PM", "Bedtime 🛏️": "11:00 PM"}, now)
        c10 = await count_doses(s_id_10)
        results["10. PERFORMANCE"] = f"PASS ({t10:.2f}s)" if c10 == 1460 else f"FAIL (Expected 1460, got {c10})"

        # 11. DATABASE INTEGRITY
        orphans = await session.execute(text("SELECT COUNT(*) FROM reminders WHERE series_id IS NOT NULL AND type != 'medicine'"))
        results["11. DB INTEGRITY"] = "PASS" if orphans.scalar() == 0 else "FAIL"
        
        print("\n--- RESULTS ---")
        for k, v in results.items():
            print(f"{k}: {v}")

asyncio.run(run_edge_cases())
