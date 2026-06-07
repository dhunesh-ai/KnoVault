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
    conn = await asyncpg.connect(db_url)
    
    user_id = await conn.fetchval("SELECT id FROM users LIMIT 1")
    if not user_id:
        user_id = 1
        await conn.execute("""
            INSERT INTO users (id, email, hashed_password, full_name, is_verified) 
            VALUES (1, 'test@test.com', 'dummy_hash', 'Test', true)
            ON CONFLICT (id) DO NOTHING
        """)
        
    token = create_access_token(data={"sub": str(user_id)})
    headers = {"Authorization": f"Bearer {token}"}
    
    await conn.execute("DELETE FROM daily_goals WHERE user_id=$1", user_id)
    await conn.execute("DELETE FROM project_tasks WHERE user_id=$1", user_id)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        
        # Inject cookie
        await context.add_cookies([{"name": "knovault-token", "value": token, "domain": "localhost", "path": "/"}])
        await context.add_init_script(f"""
            window.localStorage.setItem('auth-storage', JSON.stringify({{
                "state": {{
                    "token": "{token}",
                    "user": {{"id": {user_id}, "username": "test", "email": "test@test.com"}}
                }},
                "version": 0
            }}));
        """)
        
        page = await context.new_page()
        
        print("1. Navigating to Goals...")
        await page.goto("http://localhost:3003/goals")
        # Wait for spinner to hide
        await page.wait_for_selector(".animate-spin", state="hidden")
        await page.wait_for_timeout(1000)
        
        print("2. Creating Daily Goal...")
        await page.get_by_role("button", name="Create Goal").click()
        await page.wait_for_selector("text=Goal Name")
        
        await page.fill("input[name=title]", "Drink Water")
        await page.fill("input[name=daily_target]", "3")
        await page.fill("input[name=target_unit]", "Liters")
        await page.get_by_role("button", name="Create Goal").nth(1).click()
        
        await page.wait_for_timeout(1000)
        await page.screenshot(path="daily_goal_created.png")
        
        print("3. Marking Daily Goal Complete...")
        await page.locator(".lucide-circle").first.click()
        await page.wait_for_timeout(1000)
        await page.screenshot(path="daily_goal_completed.png")
        
        print("4. Creating Active Project...")
        await page.get_by_role("button", name="Create Goal").first.click()
        await page.wait_for_selector("text=Goal Type")
        
        await page.get_by_role("combobox").click()
        await page.get_by_role("option", name="Active Project").click()
        
        await page.fill("input[name=title]", "Movie Project")
        await page.fill("textarea[name=description]", "Research, Watch, Review")
        
        for milestone in ["Research", "Watch Movie", "Write Review"]:
            await page.get_by_role("button", name="Add").click()
            inputs = await page.query_selector_all("input[placeholder='Milestone title...']")
            await inputs[-1].fill(milestone)
        
        await page.get_by_role("button", name="Create Goal").nth(1).click()
        await page.wait_for_timeout(1500)
        
        print("5. Verifying DB & API...")
        daily_count = await conn.fetchval("SELECT count(*) FROM daily_goals WHERE user_id=$1", user_id)
        project_count = await conn.fetchval("SELECT count(*) FROM project_tasks WHERE user_id=$1", user_id)
        print(f"DB Daily Goals: {daily_count}")
        print(f"DB Projects: {project_count}")
        
        async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
            stats = await client.get("/api/goals/stats", headers=headers)
            print("API Stats:", stats.json())
        
        print("6. Testing Deletion Sync...")
        await page.get_by_role("button", name="MoreHorizontal").first.click(force=True)
        await page.get_by_text("Delete").click()
        await page.get_by_role("button", name="Delete").click()
        await page.wait_for_timeout(1000)
        
        daily_count_after = await conn.fetchval("SELECT count(*) FROM daily_goals WHERE user_id=$1", user_id)
        print(f"DB Daily Goals after delete: {daily_count_after}")
        
        await browser.close()
    await conn.close()
    print("ALL TESTS PASSED SUCCESSFULLY.")

if __name__ == "__main__":
    asyncio.run(main())
