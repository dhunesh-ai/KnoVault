import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_notes_crud_and_search(client: AsyncClient, test_user: dict):
    headers = test_user["headers"]

    # 1. Create Note
    create_res = await client.post("/api/notes", headers=headers, json={
        "title": "Meeting Notes",
        "content": "Discuss project deadline and tasks."
    })
    assert create_res.status_code in (200, 201)
    note_data = create_res.json()
    assert note_data["title"] == "Meeting Notes"
    note_id = note_data["id"]

    # 2. Get All Notes
    get_all_res = await client.get("/api/notes", headers=headers)
    assert get_all_res.status_code == 200
    notes_list = get_all_res.json()
    assert any(n["id"] == note_id for n in notes_list)

    # 3. Get Single Note
    get_one_res = await client.get(f"/api/notes/{note_id}", headers=headers)
    assert get_one_res.status_code == 200

    # 4. Update Note
    update_res = await client.put(f"/api/notes/{note_id}", headers=headers, json={
        "title": "Updated Meeting Notes",
        "content": "Updated content with action items."
    })
    assert update_res.status_code in (200, 201)

    # 5. Search Notes
    search_res = await client.get("/api/notes?search=Updated", headers=headers)
    assert search_res.status_code == 200

    # 6. Delete Note
    delete_res = await client.delete(f"/api/notes/{note_id}", headers=headers)
    assert delete_res.status_code in (200, 204)

    # 7. Verify 404 after deletion
    verify_res = await client.get(f"/api/notes/{note_id}", headers=headers)
    assert verify_res.status_code == 404
