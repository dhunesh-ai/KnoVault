import pytest
from unittest.mock import patch
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.otp import OTP
from datetime import datetime, timedelta, timezone

@pytest.mark.asyncio
async def test_send_signup_otp_success(client: AsyncClient):
    with patch("routers.auth.send_otp_email", return_value=True):
        response = await client.post("/api/auth/send-signup-otp", json={
            "email": "newuser@knovault.com",
            "full_name": "New User"
        })
        assert response.status_code == 200
        assert "Verification code sent" in response.json()["message"]

@pytest.mark.asyncio
async def test_send_signup_otp_duplicate_email(client: AsyncClient, test_user: dict):
    response = await client.post("/api/auth/send-signup-otp", json={
        "email": test_user["email"],
        "full_name": "Duplicate User"
    })
    assert response.status_code == 409

@pytest.mark.asyncio
async def test_verify_otp_valid_and_invalid(client: AsyncClient, db_session: AsyncSession):
    otp = OTP(
        email="verifytest@knovault.com",
        code="654321",
        purpose="signup",
        full_name="Verify Test",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db_session.add(otp)
    await db_session.commit()

    # Valid OTP
    res_valid = await client.post("/api/auth/verify-otp", json={
        "email": "verifytest@knovault.com",
        "code": "654321"
    })
    assert res_valid.status_code == 200

    # Invalid OTP
    res_invalid = await client.post("/api/auth/verify-otp", json={
        "email": "verifytest@knovault.com",
        "code": "000000"
    })
    assert res_invalid.status_code == 400

@pytest.mark.asyncio
async def test_login_success_and_failures(client: AsyncClient, test_user: dict):
    # Success
    res_success = await client.post("/api/auth/login", json={
        "email": test_user["email"],
        "password": "TestPassword123!"
    })
    assert res_success.status_code == 200
    data = res_success.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user["email"]

    # Incorrect Password
    res_bad_pw = await client.post("/api/auth/login", json={
        "email": test_user["email"],
        "password": "WrongPassword999"
    })
    assert res_bad_pw.status_code == 401

    # Non-existent User
    res_bad_user = await client.post("/api/auth/login", json={
        "email": "nonexistent@knovault.com",
        "password": "Password123!"
    })
    assert res_bad_user.status_code == 401

@pytest.mark.asyncio
async def test_protected_endpoint_unauthorized(client: AsyncClient):
    res = await client.get("/api/profile")
    assert res.status_code == 401
