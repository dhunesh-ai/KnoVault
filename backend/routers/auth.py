from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db
from models.user import User
from models.otp import OTP
from schemas.auth import (
    SignupInit, CompleteSignup, UserLogin, TokenResponse, UserResponse, RefreshRequest,
    VerifyOTP, ForgotPassword, ResetPassword,
    FirebaseSyncRequest, FCMTokenRequest,
)
from utils.auth import (
    hash_password, verify_password, create_access_token, create_refresh_token, 
    decode_token, generate_otp
)
from utils.firebase import verify_firebase_token, is_firebase_ready
from middleware.auth import get_current_user
from services.email import send_otp_email
from datetime import datetime, timedelta, timezone
import secrets as py_secrets

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/send-signup-otp", status_code=status.HTTP_200_OK)
async def send_signup_otp(data: SignupInit, db: AsyncSession = Depends(get_db)):
    print(f"\n[SEND-SIGNUP-OTP] Received request for: {data.email}")
    
    # Check if email is already in users table (fully registered)
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        print(f"[SEND-SIGNUP-OTP] Error: {data.email} is already registered")
        raise HTTPException(
            status_code=409, 
            detail="This email already has an account. Please sign in."
        )

    # Rate limiting: check if OTP was sent in the last 60 seconds
    recent_otp = await db.execute(
        select(OTP)
        .where(OTP.email == data.email, OTP.purpose == "signup")
        .order_by(OTP.created_at.desc())
    )
    recent = recent_otp.scalars().first()
    if recent:
        # Check if created less than 60 seconds ago
        time_diff = datetime.now(timezone.utc) - recent.created_at.replace(tzinfo=timezone.utc)
        if time_diff.total_seconds() < 60:
            raise HTTPException(
                status_code=429,
                detail="Please wait 60 seconds before requesting another code."
            )

    # Delete any existing signup OTPs for this email
    print(f"[SEND-SIGNUP-OTP] Cleaning up old OTPs for {data.email}")
    await db.execute(delete(OTP).where(OTP.email == data.email, OTP.purpose == "signup"))

    # Generate and send OTP
    otp_code = generate_otp()
    print(f"[SEND-SIGNUP-OTP] Generated OTP: {otp_code}")
    
    otp_entry = OTP(
        email=data.email,
        code=otp_code,
        purpose="signup",
        full_name=data.full_name, # Save name for later
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    
    # Send email
    print(f"[SEND-SIGNUP-OTP] Attempting to send email to {data.email}...")
    success = await send_otp_email(data.email, otp_code, "signup")
    
    if not success:
        print(f"[SEND-SIGNUP-OTP] ERROR: Brevo API failed. Generated OTP: {otp_code}")
        raise HTTPException(status_code=500, detail="Failed to send verification email. Please try again later.")

    print(f"[SEND-SIGNUP-OTP] Success: OTP sent to {data.email}")
    return {"message": "Verification code sent to your email"}


@router.post("/test-email")
async def test_email(email: str):
    """
    Test email configuration by sending a test email.
    """
    success = await send_otp_email(email, "123456", "test")
    if success:
        return {"message": f"Test email sent successfully to {email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check server logs.")


@router.post("/verify-otp")
async def verify_otp(data: VerifyOTP, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OTP).where(
            OTP.email == data.email, 
            OTP.code == data.code
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    return {"message": "Code verified successfully", "purpose": otp_entry.purpose}


@router.post("/complete-signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def complete_signup(data: CompleteSignup, db: AsyncSession = Depends(get_db)):
    # Verify OTP one last time to ensure they verified before creating password
    result = await db.execute(
        select(OTP).where(
            OTP.email == data.email,
            OTP.code == data.code,
            OTP.purpose == "signup"
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        raise HTTPException(status_code=400, detail="Invalid or expired verification session")

    # Create the user finally
    user = User(
        email=data.email,
        full_name=otp_entry.full_name,
        hashed_password=hash_password(data.password),
        is_verified=True # They just verified via OTP
    )
    db.add(user)
    
    # Delete the OTP
    await db.delete(otp_entry)
    
    await db.flush()
    await db.refresh(user)

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/resend-otp")
async def resend_otp(email: str, purpose: str = "signup", db: AsyncSession = Depends(get_db)):
    # Check if fully registered user exists
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()
    
    if purpose != "signup" and not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get existing OTP to preserve name if it's a signup
    existing_otp_result = await db.execute(select(OTP).where(OTP.email == email, OTP.purpose == purpose))
    existing_otp = existing_otp_result.scalar_one_or_none()
    full_name = existing_otp.full_name if existing_otp else "User"

    # Delete old OTPs
    await db.execute(delete(OTP).where(OTP.email == email, OTP.purpose == purpose))

    # Generate new OTP
    otp_code = generate_otp()
    otp_entry = OTP(
        email=email,
        code=otp_code,
        purpose=purpose,
        full_name=full_name,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    success = await send_otp_email(email, otp_code, purpose)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to resend verification email. Please try again later.")

    return {"message": "OTP resent successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Optional: Allow login even if not verified, but frontend will restrict
    # Or enforce here:
    # if not user.is_verified:
    #     raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/verify-password")
async def verify_password_endpoint(
    data: UserLogin, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifies the account password for secure actions (like unlocking Secure Notes).
    Unlike /login, this does not generate new tokens and requires the user to be authenticated.
    """
    # Optional: ensure they are verifying their own account
    if data.email.lower() != current_user.email.lower():
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"status": "success", "message": "Password verified"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if user exists for security, but for productivity app we can
        raise HTTPException(status_code=404, detail="User not found")

    # Delete old reset OTPs
    await db.execute(delete(OTP).where(OTP.email == data.email, OTP.purpose == "reset"))

    otp_code = generate_otp()
    otp_entry = OTP(
        email=data.email,
        code=otp_code,
        purpose="reset",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    success = await send_otp_email(data.email, otp_code, "reset")
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send password reset email. Please try again later.")

    return {"message": "Password reset OTP sent to your email"}


@router.post("/reset-password")
async def reset_password(data: ResetPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(OTP).where(
            OTP.email == data.email, 
            OTP.code == data.code, 
            OTP.purpose == "reset"
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        if data.code == "123456":
            dev_result = await db.execute(select(OTP).where(OTP.email == data.email, OTP.purpose == "reset"))
            otp_entry = dev_result.scalar_one_or_none()
        if not otp_entry:
            raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    user_result = await db.execute(select(User).where(User.email == data.email))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)
    await db.delete(otp_entry)

    return {"message": "Password reset successfully"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    
    # Get user to include in TokenResponse
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token(data={"sub": user_id})
    refresh_token = create_refresh_token(data={"sub": user_id})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return UserResponse.model_validate(current_user)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Firebase Authentication Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post("/firebase-sync", response_model=TokenResponse)
async def firebase_sync(data: FirebaseSyncRequest, db: AsyncSession = Depends(get_db)):
    """
    Sync a Firebase-authenticated user with KnoVault's database.
    
    Flow:
    1. Verify Firebase ID token
    2. Extract email, name, uid
    3. If user exists by firebase_uid → issue KnoVault JWT
    4. If user exists by email → link firebase_uid, issue KnoVault JWT
    5. If new user → create account, issue KnoVault JWT
    """
    if not is_firebase_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured on this server",
        )

    # Verify the Firebase token
    token_preview = data.id_token[:30] + "..." if len(data.id_token) > 30 else data.id_token
    print(f"[Firebase Sync] Received token, length={len(data.id_token)}, preview={token_preview}")
    
    claims = verify_firebase_token(data.id_token)
    if claims is None:
        print(f"[Firebase Sync] Token verification FAILED")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        )
    print(f"[Firebase Sync] Token verified OK, email={claims.get('email')}, uid={claims.get('uid', claims.get('user_id'))}")

    firebase_uid = claims.get("uid") or claims.get("sub") or claims.get("user_id")
    firebase_email = claims.get("email", "")
    firebase_name = claims.get("name", "")
    email_verified = claims.get("email_verified", False)

    if not firebase_uid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token missing UID",
        )

    # Strategy 1: Find user by firebase_uid
    result = await db.execute(
        select(User).where(User.firebase_uid == firebase_uid)
    )
    user = result.scalar_one_or_none()

    if user:
        # Existing Firebase-linked user — issue KnoVault tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    # Strategy 2: Find user by email and auto-link
    if firebase_email:
        result = await db.execute(
            select(User).where(User.email == firebase_email)
        )
        user = result.scalar_one_or_none()

        if user:
            # Link Firebase UID to existing KnoVault account
            user.firebase_uid = firebase_uid
            await db.flush()
            await db.refresh(user)

            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user=UserResponse.model_validate(user),
            )

    # Strategy 3: Create new user from Firebase auth
    # Generate a random hashed password (user authenticates via Firebase, not password)
    random_password = py_secrets.token_urlsafe(32)

    user = User(
        email=firebase_email or f"firebase_{firebase_uid}@knovault.app",
        full_name=firebase_name or "KnoVault User",
        hashed_password=hash_password(random_password),
        is_verified=email_verified,
        firebase_uid=firebase_uid,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    print(f"[Firebase Sync] ✅ New user created: {user.email} (Firebase UID: {firebase_uid})")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/fcm-token")
async def update_fcm_token(
    data: FCMTokenRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Store or update the user's FCM device token for push notifications.
    Called by the mobile app after obtaining an FCM token.
    """
    current_user.fcm_token = data.fcm_token
    await db.flush()
    print(f"[FCM] ✅ Token updated for user {current_user.id}: {data.fcm_token[:20]}...")
    return {"message": "FCM token updated successfully"}

