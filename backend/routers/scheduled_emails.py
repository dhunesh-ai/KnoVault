from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.scheduled_email import ScheduledEmail
from schemas.scheduled_email import ScheduledEmailResponse
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/scheduled-emails", tags=["Scheduled Emails"])

@router.get("", response_model=list[ScheduledEmailResponse])
async def get_scheduled_emails(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledEmail)
        .where(ScheduledEmail.user_id == current_user.id)
        .order_by(ScheduledEmail.send_datetime.asc())
    )
    emails = result.scalars().all()
    return [ScheduledEmailResponse.model_validate(e) for e in emails]

@router.delete("/{email_id}", status_code=204)
async def delete_scheduled_email(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ScheduledEmail).where(
            ScheduledEmail.id == email_id,
            ScheduledEmail.user_id == current_user.id
        )
    )
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="Scheduled email not found")
        
    await db.delete(email)
    await db.flush()
