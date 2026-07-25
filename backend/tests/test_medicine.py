import pytest
import json
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_medicine_reminders(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    desc = {
        "isMedicine": True,
        "medName": "Amoxicillin",
        "medType": "Tablet 💊",
        "dosage": "500 mg",
        "foodTiming": "After Food",
        "frequency": "Daily",
        "duration": "3 days",
        "timings": ["Breakfast 🍳"],
        "timing_times": {"Breakfast 🍳": "08:00 AM"}
    }

    # 1. Create Medicine Reminder
    create_res = await client.post("/api/reminders", headers=headers, json={
        "title": "Amoxicillin",
        "description": json.dumps(desc),
        "type": "medicine",
        "reminder_date": "2026-12-01T08:00:00Z"
    })
    assert create_res.status_code in (200, 201)
    med_id = create_res.json()["id"]

    # 2. Get Reminders
    get_res = await client.get("/api/reminders", headers=headers)
    assert get_res.status_code == 200
    assert any(r["id"] == med_id for r in get_res.json())

    # 3. Clean up
    del_res = await client.delete(f"/api/reminders/{med_id}", headers=headers)
    assert del_res.status_code in (200, 204)
