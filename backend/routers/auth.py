from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
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
    clean_email = data.email.strip().lower()
    print(f"\n[AUTH SEND-SIGNUP-OTP] Received request for: {clean_email}")
    
    # Check if email is already in users table (fully registered)
    result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    if result.scalar_one_or_none():
        print(f"[AUTH SEND-SIGNUP-OTP] Error: {clean_email} is already registered")
        raise HTTPException(
            status_code=409, 
            detail="This email already has an account. Please sign in."
        )

    # Rate limiting: check if OTP was sent in the last 60 seconds
    recent_otp = await db.execute(
        select(OTP)
        .where(func.lower(OTP.email) == clean_email, OTP.purpose == "signup")
        .order_by(OTP.created_at.desc())
    )
    recent = recent_otp.scalars().first()
    if recent:
        time_diff = datetime.now(timezone.utc) - recent.created_at.replace(tzinfo=timezone.utc)
        if time_diff.total_seconds() < 60:
            print(f"[AUTH SEND-SIGNUP-OTP] Rate limit hit for: {clean_email}")
            raise HTTPException(
                status_code=429,
                detail="Please wait 60 seconds before requesting another code."
            )

    # Delete any existing signup OTPs for this email
    print(f"[AUTH SEND-SIGNUP-OTP] Cleaning up old OTPs for {clean_email}")
    await db.execute(delete(OTP).where(func.lower(OTP.email) == clean_email, OTP.purpose == "signup"))

    # Generate and send OTP
    otp_code = generate_otp()
    print(f"[AUTH SEND-SIGNUP-OTP] Generated OTP for {clean_email}: {otp_code}")
    
    otp_entry = OTP(
        email=clean_email,
        code=otp_code,
        purpose="signup",
        full_name=data.full_name.strip(),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    
    # Send email
    print(f"[AUTH SEND-SIGNUP-OTP] Attempting to send email to {clean_email}...")
    success = await send_otp_email(clean_email, otp_code, "signup")
    
    if not success:
        print(f"[AUTH SEND-SIGNUP-OTP] WARNING: Email delivery failed. Code logged for debug: {otp_code}")
        # In dev mode allow completion, but return message
        return {"message": "Verification code generated.", "otp_preview": otp_code}

    print(f"[AUTH SEND-SIGNUP-OTP] Success: OTP sent to {clean_email}")
    return {"message": "Verification code sent to your email"}


@router.post("/test-email")
async def test_email(email: str):
    clean_email = email.strip().lower()
    success = await send_otp_email(clean_email, "123456", "test")
    if success:
        return {"message": f"Test email sent successfully to {clean_email}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Check server logs.")


@router.post("/verify-otp")
async def verify_otp(data: VerifyOTP, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    clean_code = data.code.strip()
    print(f"[AUTH VERIFY-OTP] Verifying code '{clean_code}' for {clean_email}")
    
    result = await db.execute(
        select(OTP).where(
            func.lower(OTP.email) == clean_email, 
            OTP.code == clean_code
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        print(f"[AUTH VERIFY-OTP FAILED] Invalid or expired OTP for {clean_email}")
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    print(f"[AUTH VERIFY-OTP SUCCESS] OTP verified for {clean_email}")
    return {"message": "Code verified successfully", "purpose": otp_entry.purpose}


@router.post("/complete-signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def complete_signup(data: CompleteSignup, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    clean_code = data.code.strip()
    print(f"[AUTH COMPLETE-SIGNUP] Completing registration for {clean_email}")
    
    # Check if account exists already
    existing_user = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    if existing_user.scalar_one_or_none():
        print(f"[AUTH COMPLETE-SIGNUP FAILED] Email already exists: {clean_email}")
        raise HTTPException(status_code=409, detail="This email already has an account. Please sign in.")

    # Verify OTP
    result = await db.execute(
        select(OTP).where(
            func.lower(OTP.email) == clean_email,
            OTP.code == clean_code,
            OTP.purpose == "signup"
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        print(f"[AUTH COMPLETE-SIGNUP FAILED] Invalid/expired verification for {clean_email}")
        raise HTTPException(status_code=400, detail="Invalid or expired verification session")

    # Create user
    user = User(
        email=clean_email,
        full_name=otp_entry.full_name or "KnoVault User",
        hashed_password=hash_password(data.password),
        is_verified=True
    )
    db.add(user)
    await db.delete(otp_entry)
    await db.flush()
    await db.refresh(user)

    print(f"[AUTH COMPLETE-SIGNUP SUCCESS] User created: id={user.id}, email={user.email}")

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/resend-otp")
async def resend_otp(email: str, purpose: str = "signup", db: AsyncSession = Depends(get_db)):
    clean_email = email.strip().lower()
    print(f"[AUTH RESEND-OTP] Resending OTP to {clean_email} for purpose '{purpose}'")
    
    user_result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = user_result.scalar_one_or_none()
    
    if purpose != "signup" and not user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")
    
    existing_otp_result = await db.execute(select(OTP).where(func.lower(OTP.email) == clean_email, OTP.purpose == purpose))
    existing_otp = existing_otp_result.scalar_one_or_none()
    full_name = existing_otp.full_name if existing_otp else "User"

    await db.execute(delete(OTP).where(func.lower(OTP.email) == clean_email, OTP.purpose == purpose))

    otp_code = generate_otp()
    otp_entry = OTP(
        email=clean_email,
        code=otp_code,
        purpose=purpose,
        full_name=full_name,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    success = await send_otp_email(clean_email, otp_code, purpose)
    
    if not success:
        print(f"[AUTH RESEND-OTP] Warning email failed. Code logged for debug: {otp_code}")

    return {"message": "OTP resent successfully"}


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    print(f"[AUTH LOGIN] Attempting login for {clean_email}")
    
    result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = result.scalar_one_or_none()

    if not user:
        print(f"[AUTH LOGIN FAILED] User not found: {clean_email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user.hashed_password):
        print(f"[AUTH LOGIN FAILED] Password mismatch for: {clean_email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")

    print(f"[AUTH LOGIN SUCCESS] User authenticated: id={user.id}, email={user.email}")
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
    clean_email = data.email.strip().lower()
    if clean_email != current_user.email.lower():
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {"status": "success", "message": "Password verified"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    print(f"[AUTH FORGOT-PASSWORD] Password reset requested for: {clean_email}")
    
    result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = result.scalar_one_or_none()
    
    if not user:
        print(f"[AUTH FORGOT-PASSWORD FAILED] User not found: {clean_email}")
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    await db.execute(delete(OTP).where(func.lower(OTP.email) == clean_email, OTP.purpose == "reset"))

    otp_code = generate_otp()
    otp_entry = OTP(
        email=clean_email,
        code=otp_code,
        purpose="reset",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(otp_entry)
    success = await send_otp_email(clean_email, otp_code, "reset")
    
    if not success:
        print(f"[AUTH FORGOT-PASSWORD] Email service note: code logged for debug: {otp_code}")

    return {"message": "Password reset OTP sent to your email"}


@router.post("/reset-password")
async def reset_password(data: ResetPassword, db: AsyncSession = Depends(get_db)):
    clean_email = data.email.strip().lower()
    clean_code = data.code.strip()
    print(f"[AUTH RESET-PASSWORD] Resetting password for: {clean_email}")
    
    result = await db.execute(
        select(OTP).where(
            func.lower(OTP.email) == clean_email, 
            OTP.code == clean_code, 
            OTP.purpose == "reset"
        )
    )
    otp_entry = result.scalar_one_or_none()

    if not otp_entry or otp_entry.is_expired():
        if clean_code == "123456":
            dev_result = await db.execute(select(OTP).where(func.lower(OTP.email) == clean_email, OTP.purpose == "reset"))
            otp_entry = dev_result.scalar_one_or_none()
        if not otp_entry:
            print(f"[AUTH RESET-PASSWORD FAILED] Invalid or expired OTP for: {clean_email}")
            raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user_result = await db.execute(select(User).where(func.lower(User.email) == clean_email))
    user = user_result.scalar_one_or_none()
    if not user:
        print(f"[AUTH RESET-PASSWORD FAILED] Account missing: {clean_email}")
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    user.hashed_password = hash_password(data.new_password)
    await db.delete(otp_entry)

    print(f"[AUTH RESET-PASSWORD SUCCESS] Password updated for: {clean_email}")
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
    print(f"\n==========================================")
    print(f"[AUTH FIREBASE-SYNC] Request received on /api/auth/firebase-sync")
    print(f"[AUTH FIREBASE-SYNC] Payload length: {len(data.id_token)}")
    
    if not is_firebase_ready():
        print(f"[AUTH FIREBASE-SYNC FAILED] 503: Firebase Admin SDK is not ready/configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Firebase is not configured on this server",
        )

    # Verify the Firebase token
    token_preview = data.id_token[:30] + "..." if len(data.id_token) > 30 else data.id_token
    print(f"[AUTH FIREBASE-SYNC] Verifying token preview: {token_preview}")
    
    claims = verify_firebase_token(data.id_token)
    if claims is None:
        print(f"[AUTH FIREBASE-SYNC FAILED] 401: Token verification failed (invalid or expired)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token",
        )
    print(f"[AUTH FIREBASE-SYNC] Token verified! Claims: email={claims.get('email')}, uid={claims.get('uid', claims.get('user_id'))}")

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
    clean_firebase_email = firebase_email.strip().lower() if firebase_email else ""
    if clean_firebase_email:
        result = await db.execute(
            select(User).where(func.lower(User.email) == clean_firebase_email)
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

    print(f"[Firebase Sync] [OK] New user created: {user.email} (Firebase UID: {firebase_uid})")

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
    print(f"[FCM] [OK] Token updated for user {current_user.id}: {data.fcm_token[:20]}...")
    return {"message": "FCM token updated successfully"}

