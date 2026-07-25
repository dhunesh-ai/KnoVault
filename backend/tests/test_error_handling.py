import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_404_not_found_endpoints(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # Non-existent endpoint
    res = await client.get("/api/nonexistent-route-xyz", headers=headers)
    assert res.status_code == 404

@pytest.mark.asyncio
async def test_401_unauthorized_token(client: AsyncClient):
    bad_headers = {"Authorization": "Bearer invalid_jwt_token_format"}
    res = await client.get("/api/notes", headers=bad_headers)
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_422_validation_error(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # Sending invalid data type
    res = await client.post("/api/notes", headers=headers, json={
        "invalid_field_name": 12345
    })
    assert res.status_code == 422
