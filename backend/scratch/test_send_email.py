import asyncio
import httpx

async def test_endpoint():
    # Set client timeout to 30.0s
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Full payload
        resp = await client.post("http://127.0.0.1:8000/api/important-days/send-test-email", json={
            "recipient_email": "thinkgood24hrs@gmail.com",
            "email_subject": "Custom subject",
            "email_message": "Custom message body"
        })
        print("Test 1 (Full Payload) Status:", resp.status_code)
        print("Response:", resp.json())
        
        # Test 2: Minimal payload (missing optional fields to test defaults)
        resp2 = await client.post("http://127.0.0.1:8000/api/important-days/send-test-email", json={
            "recipient_email": "thinkgood24hrs@gmail.com"
        })
        print("Test 2 (Default Fallbacks) Status:", resp2.status_code)
        print("Response:", resp2.json())

asyncio.run(test_endpoint())
