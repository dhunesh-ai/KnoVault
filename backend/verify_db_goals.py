import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        result = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result.fetchall()]
        print("TABLES:", tables)
        
        # Check if goals exists
        if "goals" in tables:
            print("\nGOALS SCHEMA:")
            schema = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'goals'"))
            print(schema.fetchall())
            
        if "project_tasks" in tables:
            print("\nPROJECT_TASKS SCHEMA:")
            schema = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'project_tasks'"))
            print(schema.fetchall())
            
        if "daily_goals" in tables:
            print("\nDAILY_GOALS SCHEMA:")
            schema = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'daily_goals'"))
            print(schema.fetchall())
            
    await engine.dispose()

asyncio.run(main())
