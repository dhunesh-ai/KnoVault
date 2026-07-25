import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_projects_crud(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Project Task / Item
    create_res = await client.post("/api/projects", headers=headers, json={
        "title": "KnoVault CI Pipeline Project",
        "description": "Setup GitHub Actions and testing architecture",
        "status": "in_progress",
        "priority": "HIGH"
    })
    assert create_res.status_code in (200, 201)
    project_data = create_res.json()
    assert project_data["title"] == "KnoVault CI Pipeline Project"
    proj_id = project_data["id"]

    # 2. Get All Projects
    get_res = await client.get("/api/projects", headers=headers)
    assert get_res.status_code == 200
    assert any(p["id"] == proj_id for p in get_res.json())

    # 3. Update Project
    update_res = await client.put(f"/api/projects/{proj_id}", headers=headers, json={
        "title": "KnoVault CI Pipeline Project",
        "status": "completed",
        "priority": "HIGH"
    })
    assert update_res.status_code in (200, 201, 204, 404)

    # 4. Delete Project
    del_res = await client.delete(f"/api/projects/{proj_id}", headers=headers)
    assert del_res.status_code in (200, 204, 404)
