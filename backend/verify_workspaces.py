import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, engine
from sqlalchemy import text


async def test_db_init():
    print("[TEST] Starting database connection test...")
    try:
        # Initialize DB (which triggers Base.metadata.create_all for workspaces)
        await init_db()
        print("[TEST] init_db completed successfully!")
        
        # Verify tables are queryable
        async with engine.begin() as conn:
            # Check workspaces table
            print("[TEST] Testing select from workspaces...")
            res = await conn.execute(text("SELECT count(*) FROM workspaces"))
            count = res.scalar()
            print(f"[TEST] Successfully connected and queried. Workspaces count: {count}")
            
            # Check workspace_members
            res = await conn.execute(text("SELECT count(*) FROM workspace_members"))
            print(f"[TEST] workspace_members count: {res.scalar()}")

            # Check workspace_activities
            res = await conn.execute(text("SELECT count(*) FROM workspace_activities"))
            print(f"[TEST] workspace_activities count: {res.scalar()}")
            
        print("[TEST] All tests passed! Backend models successfully verified.")
        sys.exit(0)
    except Exception as e:
        print(f"[TEST] FAILED: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_db_init())
