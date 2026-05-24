"""
KnoVault — Firebase Admin SDK Utility

Provides:
  - Safe Firebase Admin SDK initialization
  - Firebase JWT token verification
  - FCM push notification sending
"""
import os
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Firebase Admin SDK — Safe Initialization
# ---------------------------------------------------------------------------
# Searches for credentials in this order:
#   1. backend/secrets/firebase-adminsdk.json
#   2. backend/firebase-adminsdk.json
#   3. GOOGLE_APPLICATION_CREDENTIALS env var
#   4. FIREBASE_CREDENTIALS_JSON env var (inline JSON string)
# ---------------------------------------------------------------------------

_firebase_app = None
_firebase_initialized = False


def _find_credentials_path() -> str | None:
    """Locate Firebase Admin SDK credentials file."""
    base_dir = Path(__file__).resolve().parent.parent  # backend/
    candidates = [
        base_dir / "secrets" / "firebase-adminsdk.json",
        base_dir / "firebase-adminsdk.json",
    ]
    for path in candidates:
        if path.exists():
            return str(path)

    # Check environment variable
    env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if env_path and Path(env_path).exists():
        return env_path

    return None


def initialize_firebase() -> bool:
    """
    Initialize Firebase Admin SDK. Safe to call multiple times.
    Returns True if Firebase is ready, False otherwise.
    """
    global _firebase_app, _firebase_initialized

    if _firebase_initialized:
        return _firebase_app is not None

    _firebase_initialized = True

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Check if already initialized by another module
        try:
            _firebase_app = firebase_admin.get_app()
            logger.info("[Firebase] Already initialized — reusing existing app")
            return True
        except ValueError:
            pass  # Not yet initialized

        # Try file-based credentials
        cred_path = _find_credentials_path()
        if cred_path:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info(f"[Firebase] Initialized from: {cred_path}")
            print(f"[Firebase] ✅ Admin SDK initialized from: {cred_path}")
            return True

        # Try inline JSON from env
        cred_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("[Firebase] Initialized from FIREBASE_CREDENTIALS_JSON env var")
            print("[Firebase] ✅ Admin SDK initialized from environment variable")
            return True

        logger.warning("[Firebase] No credentials found — Firebase features disabled")
        print("[Firebase] ⚠️ No credentials found — Firebase features will be disabled")
        return False

    except Exception as e:
        logger.error(f"[Firebase] Initialization failed: {e}")
        print(f"[Firebase] ❌ Initialization failed: {e}")
        return False


def is_firebase_ready() -> bool:
    """Check if Firebase Admin SDK is initialized and ready."""
    return _firebase_app is not None


# ---------------------------------------------------------------------------
# Firebase JWT Token Verification
# ---------------------------------------------------------------------------

def verify_firebase_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token (JWT from Firebase Auth).
    
    Returns decoded token claims dict on success, None on failure.
    Claims include: uid, email, name, picture, email_verified, etc.
    """
    if not is_firebase_ready():
        logger.warning("[Firebase] Cannot verify token — SDK not initialized")
        return None

    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(id_token)
        return decoded
    except firebase_admin.auth.ExpiredIdTokenError:
        logger.warning("[Firebase] Token expired")
        return None
    except firebase_admin.auth.RevokedIdTokenError:
        logger.warning("[Firebase] Token revoked")
        return None
    except firebase_admin.auth.InvalidIdTokenError as e:
        logger.warning(f"[Firebase] Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"[Firebase] Token verification error: {e}")
        return None


# ---------------------------------------------------------------------------
# FCM Push Notifications
# ---------------------------------------------------------------------------

def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: dict | None = None,
    image_url: str | None = None,
) -> str | None:
    """
    Send a push notification to a single device via FCM.
    
    Returns message ID on success, None on failure.
    """
    if not is_firebase_ready():
        logger.warning("[Firebase] Cannot send push — SDK not initialized")
        return None

    try:
        from firebase_admin import messaging

        notification = messaging.Notification(
            title=title,
            body=body,
            image=image_url,
        )

        # Android-specific configuration
        android_config = messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                icon="ic_notification",
                color="#7C4DFF",
                sound="default",
                channel_id="knovault_default",
            ),
        )

        message = messaging.Message(
            notification=notification,
            android=android_config,
            data=data or {},
            token=fcm_token,
        )

        response = messaging.send(message)
        logger.info(f"[Firebase] Push sent: {response}")
        return response

    except messaging.UnregisteredError:
        logger.warning(f"[Firebase] FCM token unregistered: {fcm_token[:20]}...")
        return None
    except Exception as e:
        logger.error(f"[Firebase] Push send error: {e}")
        return None


async def send_push_to_user(
    db,
    user_id: int,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """
    Look up a user's FCM token from the database and send a push notification.
    Returns True if sent successfully.
    """
    try:
        from sqlalchemy import select
        from models.user import User

        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user or not user.fcm_token:
            logger.info(f"[Firebase] No FCM token for user {user_id}")
            return False

        msg_id = send_push_notification(user.fcm_token, title, body, data)
        return msg_id is not None

    except Exception as e:
        logger.error(f"[Firebase] send_push_to_user error: {e}")
        return False


def send_push_to_multiple(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> dict:
    """
    Send push notification to multiple devices.
    Returns dict with success_count and failure_count.
    """
    if not is_firebase_ready() or not fcm_tokens:
        return {"success_count": 0, "failure_count": len(fcm_tokens or [])}

    try:
        from firebase_admin import messaging

        notification = messaging.Notification(title=title, body=body)
        android_config = messaging.AndroidConfig(
            priority="high",
            notification=messaging.AndroidNotification(
                icon="ic_notification",
                color="#7C4DFF",
                sound="default",
                channel_id="knovault_default",
            ),
        )

        message = messaging.MulticastMessage(
            notification=notification,
            android=android_config,
            data=data or {},
            tokens=fcm_tokens,
        )

        response = messaging.send_each_for_multicast(message)
        logger.info(
            f"[Firebase] Multicast: {response.success_count} success, "
            f"{response.failure_count} failure"
        )
        return {
            "success_count": response.success_count,
            "failure_count": response.failure_count,
        }

    except Exception as e:
        logger.error(f"[Firebase] Multicast error: {e}")
        return {"success_count": 0, "failure_count": len(fcm_tokens)}
