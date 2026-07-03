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
import firebase_admin
from firebase_admin import credentials, auth, messaging

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
            print(f"[Firebase] [OK] Admin SDK initialized from: {cred_path}")
            return True

        # Try inline JSON from settings/env
        from config import get_settings
        settings = get_settings()
        
        cred_json = (
            settings.FIREBASE_CREDENTIALS_JSON or
            settings.FIREBASE_SERVICE_ACCOUNT_JSON or
            os.environ.get("FIREBASE_CREDENTIALS_JSON") or
            os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        )
        
        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("[Firebase] Initialized from inline JSON credentials")
            print("[Firebase] [OK] Admin SDK initialized from inline JSON credentials environment/config variable")
            return True

        logger.warning("[Firebase] No credentials found — Firebase features disabled")
        print("[Firebase] [WARN] No credentials found — Firebase features will be disabled")
        return False

    except Exception as e:
        logger.error(f"[Firebase] Initialization failed: {e}")
        print(f"[Firebase] [ERROR] Initialization failed: {e}")
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
    
    Handles clock skew between client devices and server by:
    1. First attempting standard verification with max allowed skew (60s)
    2. If that fails due to clock skew, retrying with manual time tolerance
    """
    if not is_firebase_ready():
        logger.warning("[Firebase] Cannot verify token — SDK not initialized")
        return None

    # Attempt 1: Standard verification with maximum allowed clock skew (60s)
    try:
        decoded = auth.verify_id_token(id_token, clock_skew_seconds=60)
        logger.info(f"[Firebase] Token verified successfully for: {decoded.get('email', 'unknown')}")
        return decoded
    except auth.ExpiredIdTokenError:
        logger.warning("[Firebase] Token expired")
        return None
    except auth.RevokedIdTokenError:
        logger.warning("[Firebase] Token revoked")
        return None
    except auth.InvalidIdTokenError as e:
        error_msg = str(e)
        # Check if the failure is specifically due to clock skew ("used too early")
        if "Token used too early" in error_msg:
            logger.warning(f"[Firebase] Clock skew detected beyond 60s: {e}")
            return _verify_with_extended_clock_tolerance(id_token)
        logger.warning(f"[Firebase] Invalid token: {e}")
        return None
    except Exception as e:
        logger.error(f"[Firebase] Token verification error: {e}")
        return None


def _verify_with_extended_clock_tolerance(id_token: str) -> dict | None:
    """
    Fallback verification for tokens with clock skew > 60 seconds.
    
    Uses google.auth.jwt to decode the token and manually validate
    key claims while tolerating extended clock differences (up to 5 min).
    """
    import time

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
        import google.auth.jwt

        # Decode without full verification to inspect claims
        # This still validates the signature against Google's public keys
        header = google.auth.jwt.decode_header(id_token)
        
        # Decode the payload (unverified) to inspect timing claims
        unverified = google.auth.jwt.decode(id_token, verify=False)
        
        current_time = time.time()
        iat = unverified.get("iat", 0)
        exp = unverified.get("exp", 0)
        
        # Allow up to 5 minutes of clock skew for "issued at" time
        max_clock_skew = 300  # 5 minutes
        
        if iat > current_time + max_clock_skew:
            logger.warning(f"[Firebase] Token iat too far in future even with 5min tolerance: iat={iat}, now={current_time}")
            return None
        
        if exp < current_time - max_clock_skew:
            logger.warning(f"[Firebase] Token expired even with 5min tolerance: exp={exp}, now={current_time}")
            return None
        
        # Validate issuer
        project_id = unverified.get("iss", "").replace("https://securetoken.google.com/", "")
        if not project_id:
            logger.warning("[Firebase] Token missing valid issuer")
            return None
        
        # Validate audience matches our project
        aud = unverified.get("aud", "")
        firebase_project = _firebase_app.project_id if _firebase_app else None
        if firebase_project and aud != firebase_project:
            logger.warning(f"[Firebase] Token audience mismatch: {aud} != {firebase_project}")
            return None
        
        # Verify the token signature against Google's public keys
        # by using google.oauth2.id_token.verify_firebase_token
        request = google_requests.Request()
        verified_claims = google_id_token.verify_firebase_token(id_token, request, audience=firebase_project, clock_skew_in_seconds=max_clock_skew)
        
        logger.info(f"[Firebase] Token verified with extended clock tolerance for: {verified_claims.get('email', 'unknown')}")
        return verified_claims
        
    except Exception as e:
        logger.error(f"[Firebase] Extended clock tolerance verification also failed: {e}")
        return None


# ---------------------------------------------------------------------------
# FCM Push Notifications
# ---------------------------------------------------------------------------

def send_expo_push(
    token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> str | None:
    """Send a push notification via Expo Push Notification API."""
    import requests
    try:
        payload = {
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
            "channelId": "workspace-alerts",
            "priority": "high",
        }
        if data:
            payload["data"] = data
            
        res = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        if res.status_code == 200:
            res_data = res.json()
            logger.info(f"[ExpoPush] Push sent successfully: {res_data}")
            return "expo-success"
        else:
            logger.error(f"[ExpoPush] API failed with status {res.status_code}: {res.text}")
            return None
    except Exception as e:
        logger.error(f"[ExpoPush] Error sending push: {e}")
        return None


def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: dict | None = None,
    image_url: str | None = None,
) -> str | None:
    """
    Send a push notification to a single device via FCM or Expo Push.
    
    Returns message ID on success, None on failure.
    """
    if fcm_token and fcm_token.startswith("ExponentPushToken"):
        return send_expo_push(fcm_token, title, body, data)

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
                channel_id="workspace-alerts",
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
                channel_id="workspace-alerts",
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
