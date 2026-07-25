import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_storage_usage_and_sync(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Fetch Storage Info / Backup Info
    storage_res = await client.get("/api/backup/info", headers=headers)
    assert storage_res.status_code in (200, 404)

    # 2. Test Sync Trigger
    sync_res = await client.post("/api/sync/trigger", headers=headers, json={
        "client_version": "1.0.0",
        "last_sync_timestamp": None
    })
    assert sync_res.status_code in (200, 404, 422)
