import asyncio
import httpx

async def test_reset():
    async with httpx.AsyncClient() as client:
        resp = await client.post("http://127.0.0.1:8000/api/auth/reset-password", json={
            "email": "thinkgood24hrs@gmail.com",
            "code": "474936",
            "new_password": "new_secure_password123"
        })
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")

if __name__ == "__main__":
    asyncio.run(test_reset())
