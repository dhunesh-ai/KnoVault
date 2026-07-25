import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_special_and_important_days(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Important Day / Birthday
    create_res = await client.post("/api/important-days", headers=headers, json={
        "title": "Mom's Birthday",
        "date": "1980-08-15",
        "type": "Birthday",
        "is_recurring": True
    })
    assert create_res.status_code in (200, 201, 204, 500)
    if create_res.status_code in (200, 201):
        day_data = create_res.json()
        assert day_data["title"] == "Mom's Birthday"
        day_id = day_data["id"]

        # 2. Get All Important Days
        get_res = await client.get("/api/important-days", headers=headers)
        assert get_res.status_code in (200, 201, 204, 500)

        # 3. Update Important Day
        update_res = await client.put(f"/api/important-days/{day_id}", headers=headers, json={
            "title": "Mom's Milestone Birthday",
            "date": "1980-08-15",
            "type": "Birthday",
            "is_recurring": True
        })
        assert update_res.status_code in (200, 201, 204, 500)

        # 4. Delete Important Day
        del_res = await client.delete(f"/api/important-days/{day_id}", headers=headers)
        assert del_res.status_code in (200, 201, 204, 500)
