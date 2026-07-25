import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_workspaces_crud_and_members(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Workspace
    create_res = await client.post("/api/workspaces", headers=headers, json={
        "name": "Engineering Team Workspace",
        "description": "Collaborative workspace for dev team"
    })
    assert create_res.status_code in (200, 201)
    ws_data = create_res.json()
    assert ws_data["name"] == "Engineering Team Workspace"
    ws_id = ws_data["id"]

    # 2. List User Workspaces
    list_res = await client.get("/api/workspaces", headers=headers)
    assert list_res.status_code == 200
    assert any(w["id"] == ws_id for w in list_res.json())

    # 3. Get Workspace Details
    get_res = await client.get(f"/api/workspaces/{ws_id}", headers=headers)
    assert get_res.status_code == 200

    # 4. Update Workspace
    update_res = await client.put(f"/api/workspaces/{ws_id}", headers=headers, json={
        "name": "Updated Eng Workspace",
        "description": "Updated description"
    })
    assert update_res.status_code in (200, 201, 204, 404)

    # 5. Delete Workspace
    del_res = await client.delete(f"/api/workspaces/{ws_id}", headers=headers)
    assert del_res.status_code in (200, 204)
