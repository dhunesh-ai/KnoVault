import logging
from cryptography.fernet import Fernet, InvalidToken
from config import get_settings

logger = logging.getLogger(__name__)

def get_fernet() -> Fernet | None:
    key = get_settings().FERNET_SECRET_KEY
    if not key:
        logger.error("[Encryption] FERNET_SECRET_KEY is missing from environment variables!")
        return None
    try:
        return Fernet(key.encode())
    except Exception as e:
        logger.error(f"[Encryption] Invalid FERNET_SECRET_KEY configuration: {e}")
        return None

def encrypt_text(content: str) -> str:
    """Encrypts plaintext content. Returns the original content if encryption fails."""
    if not content:
        return content
        
    f = get_fernet()
    if not f:
        return content
        
    try:
        encrypted = f.encrypt(content.encode())
        logger.info("[Encryption] Secure note encrypted successfully")
        return encrypted.decode()
    except Exception as e:
        logger.error(f"[Encryption] Failed to encrypt note: {e}")
        return content

def decrypt_text(content: str) -> str:
    """Decrypts ciphertext. Returns the original content if it's not encrypted or decryption fails."""
    if not content:
        return content
        
    f = get_fernet()
    if not f:
        return content
        
    try:
        decrypted = f.decrypt(content.encode())
        logger.info("[Encryption] Secure note decrypted successfully")
        return decrypted.decode()
    except InvalidToken:
        # This handles the migration case where older notes are not encrypted
        logger.warning("[Encryption] InvalidToken: Note was likely unencrypted. Returning original content safely.")
        return content
    except Exception as e:
        logger.error(f"[Encryption] Decryption failed: {e}. Returning original content safely.")
        return content
