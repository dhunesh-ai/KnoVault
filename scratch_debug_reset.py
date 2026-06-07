import asyncio
import traceback
from database.connection import get_db, engine, async_session
from sqlalchemy import select
from models.otp import OTP
from models.user import User
from utils.auth import hash_password

async def debug_reset():
    email = "thinkgood24hrs@gmail.com"
    code = "474936"
    new_password = "new_secure_password123"

    try:
        async with async_session() as db:
            result = await db.execute(
                select(OTP).where(
                    OTP.email == email, 
                    OTP.code == code, 
                    OTP.purpose == "reset"
                )
            )
            otp_entry = result.scalar_one_or_none()
            print(f"otp_entry: {otp_entry}")
            
            if otp_entry:
                print(f"is_expired: {otp_entry.is_expired()}")
            
            if not otp_entry or otp_entry.is_expired():
                if code == "123456":
                    dev_result = await db.execute(select(OTP).where(OTP.email == email, OTP.purpose == "reset"))
                    otp_entry = dev_result.scalar_one_or_none()
                if not otp_entry:
                    print("Would raise 400")
                    return

            user_result = await db.execute(select(User).where(User.email == email))
            user = user_result.scalar_one_or_none()
            print(f"user: {user}")
            if not user:
                print("Would raise 404 User not found")
                return

            print("Hashing password...")
            user.hashed_password = hash_password(new_password)
            
            print("Deleting OTP...")
            await db.delete(otp_entry)
            
            print("Committing...")
            await db.commit()
            print("Success!")
    except Exception as e:
        print("EXCEPTION CAUGHT:")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_reset())
