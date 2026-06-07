import asyncio
import httpx
from utils.auth import create_access_token
from datetime import date
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    token = create_access_token(data={"sub": "1"})
    headers = {"Authorization": f"Bearer {token}"}
    
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        print("--- API AUDIT ---")
        
        # 1. Create Daily Goal
        print("\nCreating Daily Goal 'Drink Water'...")
        daily_payload = {
            "title": "Drink Water",
            "daily_target": 3,
            "target_unit": "Liters",
            "start_date": str(date.today()),
            "reminder_time": "08:00",
            "goal_type": "daily_goal"
        }
        res = await client.post("/api/goals", json=daily_payload, headers=headers)
        print("POST /api/goals:", res.status_code)
        daily_id = res.json().get("id")
        
        # 2. Create Project Goal
        print("\nCreating Project 'Movie Project'...")
        project_payload = {
            "title": "Movie Project",
            "description": "Make a cool movie",
            "priority": "High",
            "subtasks": [
                {"title": "Research", "completed": False},
                {"title": "Watch Movie", "completed": False},
                {"title": "Write Review", "completed": False}
            ]
        }
        res = await client.post("/api/projects", json=project_payload, headers=headers)
        print("POST /api/projects:", res.status_code)
        project_id = res.json().get("id")
        
        # 3. GET Daily Goals
        res = await client.get("/api/goals", headers=headers)
        print("GET /api/goals:", [g["title"] for g in res.json()])
        
        # 4. GET Projects
        res = await client.get("/api/projects", headers=headers)
        print("GET /api/projects:", [p["title"] for p in res.json()])
        
        # 5. GET Stats
        res = await client.get("/api/goals/stats", headers=headers)
        print("GET /api/goals/stats:", res.json())
        
        # 6. Clean up
        if daily_id:
            await client.delete(f"/api/goals/{daily_id}", headers=headers)
        if project_id:
            await client.delete(f"/api/projects/{project_id}", headers=headers)
            
if __name__ == "__main__":
    asyncio.run(main())
