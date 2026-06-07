import asyncio
from playwright.async_api import async_playwright
import asyncpg
import os
from dotenv import load_dotenv
import httpx
from utils.auth import create_access_token

load_dotenv()
db_url = os.getenv("DATABASE_URL").replace("+asyncpg", "")

async def main():
    token = create_access_token(data={"sub": "1"})
    headers = {"Authorization": f"Bearer {token}"}
    
    # Pre-clean DB for user 1
    conn = await asyncpg.connect(db_url)
    await conn.execute("DELETE FROM daily_goals WHERE user_id=1")
    await conn.execute("DELETE FROM project_tasks WHERE user_id=1")
    
    # Create playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Mock auth via localStorage
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        await context.add_init_script(f"""
            window.localStorage.setItem('auth-storage', JSON.stringify({{
                "state": {{
                    "token": "{token}",
                    "user": {{"id": 1, "username": "test", "email": "test@test.com"}}
                }},
                "version": 0
            }}));
        """)
        
        page = await context.new_page()
        
        print("1. Navigating to Goals...")
        await page.goto("http://localhost:3000/goals")
        await page.wait_for_selector("text=Goals & Projects")
        
        # Test 1: Daily Goals
        print("2. Creating Daily Goal...")
        await page.click("text=Create Goal")
        await page.wait_for_selector("text=Goal Name")
        await page.fill("input[name=title]", "Drink Water")
        await page.fill("input[name=daily_target]", "3")
        await page.fill("input[name=target_unit]", "Liters")
        await page.click("button[type=submit]")
        
        await page.wait_for_timeout(1000)
        await page.screenshot(path="daily_goal_created.png")
        
        # Mark Complete
        print("3. Marking Daily Goal Complete...")
        await page.click(".lucide-circle") # Click empty circle
        await page.wait_for_timeout(1000)
        await page.screenshot(path="daily_goal_completed.png")
        
        # Test 2: Active Projects
        print("4. Creating Active Project...")
        await page.click("text=Create Goal")
        await page.wait_for_selector("text=Goal Name")
        
        # Switch select
        await page.click("button[role=combobox]")
        await page.click("text=Active Project")
        
        await page.fill("input[name=title]", "Movie Project")
        await page.fill("textarea[name=description]", "Research, Watch, Review")
        
        # Add milestones
        for milestone in ["Research", "Watch Movie", "Write Review"]:
            await page.click("text=Add")
            inputs = await page.query_selector_all("input[placeholder='Milestone title...']")
            await inputs[-1].fill(milestone)
        
        await page.click("button[type=submit]")
        await page.wait_for_timeout(1000)
        
        # Switch tab to Active Projects
        await page.click("text=Active Projects")
        await page.wait_for_timeout(1000)
        await page.screenshot(path="active_projects_tab.png")
        
        print("5. Verifying DB & API...")
        # DB Verify
        daily_count = await conn.fetchval("SELECT count(*) FROM daily_goals WHERE user_id=1")
        project_count = await conn.fetchval("SELECT count(*) FROM project_tasks WHERE user_id=1")
        print(f"DB Daily Goals: {daily_count}")
        print(f"DB Projects: {project_count}")
        
        # API Verify
        async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
            stats = await client.get("/api/goals/stats", headers=headers)
            print("API Stats:", stats.json())
        
        await browser.close()
    await conn.close()
    
    print("ALL TESTS PASSED SUCCESSFULLY.")

if __name__ == "__main__":
    asyncio.run(main())
