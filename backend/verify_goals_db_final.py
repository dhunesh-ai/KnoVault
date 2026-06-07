import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL').replace('+asyncpg', '')

async def main():
    conn = await asyncpg.connect(db_url)
    daily_count = await conn.fetchval('SELECT COUNT(*) FROM daily_goals')
    project_count = await conn.fetchval('SELECT COUNT(*) FROM project_tasks')
    print(f'daily_goals count: {daily_count}')
    print(f'project_tasks count: {project_count}')
    
    daily_schema = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_goals'")
    print('\ndaily_goals schema:')
    for row in daily_schema: print(dict(row))
    
    project_schema = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'project_tasks'")
    print('\nproject_tasks schema:')
    for row in project_schema: print(dict(row))
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
