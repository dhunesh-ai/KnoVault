import logging
import traceback
import httpx
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from config import get_settings
from pydantic import EmailStr

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("email_service.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

conf = ConnectionConfig(
    MAIL_USERNAME=settings.SMTP_USER,
    MAIL_PASSWORD=settings.SMTP_PASSWORD,
    MAIL_FROM=settings.SMTP_USER, # Using SMTP_USER for MAIL_FROM to avoid auth issues with Gmail
    MAIL_PORT=settings.SMTP_PORT,
    MAIL_SERVER=settings.SMTP_HOST,
    MAIL_FROM_NAME="KnoVault",
    MAIL_STARTTLS=True if settings.SMTP_PORT == 587 else False,
    MAIL_SSL_TLS=True if settings.SMTP_PORT == 465 else False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    """
    Sends an OTP email asynchronously.
    Uses Brevo HTTP API if BREVO_API_KEY is present, otherwise falls back to fastapi-mail (SMTP).
    """
    subject = "KnoVault - Verify your account" if purpose == "verification" else "KnoVault - Reset your password"
    
    html = f"""
    <html>
        <body style="font-family: sans-serif; padding: 20px; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <h2 style="color: #6366F1; margin-bottom: 20px; text-align: center; font-size: 24px;">KnoVault</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hello,</p>
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">Your one-time password (OTP) for <strong>{purpose}</strong> is:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <h1 style="background: #F1F5F9; padding: 15px 30px; display: inline-block; border-radius: 8px; color: #1E293B; letter-spacing: 5px; font-size: 32px; border: 1px solid #e2e8f0;">{otp}</h1>
                </div>
                <p style="color: #64748b; font-size: 14px; text-align: center;">This code will expire in 10 minutes.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
            </div>
        </body>
    </html>
    """

    if settings.BREVO_API_KEY:
        logger.info(f"Attempting to send {purpose} email to {email} via Brevo HTTP API...")
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "accept": "application/json",
                    "api-key": settings.BREVO_API_KEY,
                    "content-type": "application/json"
                }
                payload = {
                    "sender": {
                        "name": "KnoVault",
                        "email": settings.SMTP_USER or "thinkgood24hrs@gmail.com"
                    },
                    "to": [
                        {
                            "email": email
                        }
                    ],
                    "subject": subject,
                    "htmlContent": html
                }
                response = await client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    json=payload,
                    headers=headers,
                    timeout=15.0
                )
                if response.status_code in (200, 201, 202):
                    logger.info(f"Successfully sent {purpose} email to {email} via Brevo HTTP API")
                    return True
                else:
                    logger.error(f"Brevo API error: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Failed to send email via Brevo HTTP API: {e}")

    # Fallback to SMTP (FastMail)
    logger.info(f"Attempting to send {purpose} email to {email} via SMTP fallback...")
    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        await fm.send_message(message)
        logger.info(f"Successfully sent {purpose} email to {email} via SMTP fallback")
        return True
    except Exception as e:
        logger.error(f"CRITICAL ERROR: Failed to send email to {email} via SMTP fallback")
        logger.error(f"Error Type: {type(e).__name__}")
        logger.error(f"Error Details: {str(e)}")
        logger.error(traceback.format_exc())
        return False
