import logging
import traceback
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
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    """
    Sends an OTP email asynchronously using fastapi-mail.
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

    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )

    fm = FastMail(conf)
    try:
        logger.info(f"Attempting to send {purpose} email to {email}...")
        await fm.send_message(message)
        logger.info(f"Successfully sent {purpose} email to {email}")
        return True
    except Exception as e:
        logger.error(f"CRITICAL ERROR: Failed to send email to {email}")
        logger.error(f"Error Type: {type(e).__name__}")
        logger.error(f"Error Details: {str(e)}")
        logger.error(traceback.format_exc())
        return False
