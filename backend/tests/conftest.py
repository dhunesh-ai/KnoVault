import asyncio
import os
import sys
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set test environment flags before importing app/config
os.environ["TESTING"] = "True"
os.environ["SECRET_KEY"] = "test-secret-key-knovault-ci-32bytes-min-len!"
os.environ["GROQ_API_KEY"] = "gsk_mock_test_key_123456789"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from database.connection import Base, get_db
from main import app
from utils.auth import create_access_token, hash_password
from models.user import User

# Test Database Engine
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

TestingSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for a test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()
        
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Return an AsyncClient hooked up to the FastAPI app with DB dependency overridden."""
    async def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db
    
    with patch("utils.firebase.initialize_firebase"), \
         patch("services.email_scheduler.auto_email_wishes_scheduler"), \
         patch("services.notification_scheduler.auto_workspace_reminders_scheduler"):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac
            
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(scope="function")
async def test_user(db_session: AsyncSession) -> dict:
    """Create and return a test user with access token and auth headers."""
    hashed_password = hash_password("TestPassword123!")
    user = User(
        email="testuser@knovault.com",
        full_name="Test User",
        hashed_password=hashed_password,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    token = create_access_token(data={"sub": str(user.id), "email": user.email})
    headers = {"Authorization": f"Bearer {token}"}

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "token": token,
        "headers": headers
    }
