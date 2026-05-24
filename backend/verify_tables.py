import asyncio
from sqlalchemy import text
from database.connection import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"))
        tables = [r[0] for r in res.fetchall()]
        print(f"Tables in 'public' schema: {tables}")
        
        # Check specific table types
        for table in ["notes", "checklist_items", "important_days"]:
            if table in tables:
                col_res = await conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'"))
                cols = col_res.fetchall()
                print(f"Columns for {table}: {cols}")

if __name__ == "__main__":
    asyncio.run(check())
