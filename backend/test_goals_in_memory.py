import asyncio
from httpx import AsyncClient, ASGITransport
from main import app
from utils.auth import create_access_token
from datetime import date

async def test_backend_goals():
    token = create_access_token(data={"sub": "1"})
    headers = {"Authorization": f"Bearer {token}"}
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("Testing POST /api/goals with extended fields...")
        daily_payload = {
            "title": "Drink Water Test",
            "daily_target": 3,
            "target_unit": "Liters",
            "start_date": str(date.today()),
            "reminder_time": "08:00",
            "repeat_schedule": "daily",
            "priority": "High",
            "difficulty": "medium",
            "color": "#6D4CFF",
            "icon": "💧",
            "notes": "Stay hydrated daily",
            "goal_type": "daily_goal"
        }
        res = await client.post("/api/goals", json=daily_payload, headers=headers)
        print("POST /api/goals status:", res.status_code)
        if res.status_code != 201:
            print("Response:", res.text)
            return
        data = res.json()
        print("Created Goal:", data)
        daily_id = data.get("id")
        
        # Verify GET /api/goals
        res_get = await client.get("/api/goals", headers=headers)
        print("GET /api/goals count:", len(res_get.json()))
        
        # Clean up
        if daily_id:
            await client.delete(f"/api/goals/{daily_id}", headers=headers)
            print("Deleted test goal")

if __name__ == "__main__":
    asyncio.run(test_backend_goals())
