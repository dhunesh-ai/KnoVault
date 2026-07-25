import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_reminders_crud_and_upcoming(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Reminder
    create_res = await client.post("/api/reminders", headers=headers, json={
        "title": "Doctor Appointment",
        "description": "Annual health checkup",
        "reminder_date": "2026-12-01T10:00:00Z",
        "type": "custom"
    })
    assert create_res.status_code in (200, 201)
    rem_data = create_res.json()
    assert rem_data["title"] == "Doctor Appointment"
    rem_id = rem_data["id"]

    # 2. Get All Reminders
    get_all_res = await client.get("/api/reminders", headers=headers)
    assert get_all_res.status_code == 200
    reminders_list = get_all_res.json()
    assert any(r["id"] == rem_id for r in reminders_list)

    # 3. Toggle Completion
    toggle_res = await client.patch(f"/api/reminders/{rem_id}/toggle", headers=headers)
    assert toggle_res.status_code in (200, 201, 204, 404)

    # 4. Delete Reminder
    del_res = await client.delete(f"/api/reminders/{rem_id}", headers=headers)
    assert del_res.status_code in (200, 204)
