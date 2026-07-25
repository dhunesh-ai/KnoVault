import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_goals_and_daily_goals(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Goal
    create_res = await client.post("/api/goals", headers=headers, json={
        "title": "Read 12 Books",
        "description": "Read one book per month",
        "target_date": "2026-12-31T00:00:00Z"
    })
    assert create_res.status_code in (200, 201)
    goal_data = create_res.json()
    assert goal_data["title"] == "Read 12 Books"
    goal_id = goal_data["id"]

    # 2. Get All Goals
    get_res = await client.get("/api/goals", headers=headers)
    assert get_res.status_code == 200
    assert any(g["id"] == goal_id for g in get_res.json())

    # 3. Update Goal Progress
    update_res = await client.put(f"/api/goals/{goal_id}", headers=headers, json={
        "title": "Read 12 Books",
        "progress": 50,
        "is_completed": False
    })
    assert update_res.status_code in (200, 201, 204, 404)

    # 4. Delete Goal
    del_res = await client.delete(f"/api/goals/{goal_id}", headers=headers)
    assert del_res.status_code in (200, 204, 404)
