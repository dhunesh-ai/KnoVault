import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_calendar_events_and_notes(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Fetch Calendar Events
    events_res = await client.get("/api/calendar/events?year=2026&month=7", headers=headers)
    assert events_res.status_code == 200

    # 2. Save Calendar Note
    note_res = await client.post("/api/calendar-notes", headers=headers, json={
        "title": "Planning Note",
        "content": "Important planning session",
        "note_date": "2026-07-25"
    })
    assert note_res.status_code in (200, 201)

    # 3. Get Calendar Notes
    get_notes_res = await client.get("/api/calendar-notes", headers=headers)
    assert get_notes_res.status_code == 200
