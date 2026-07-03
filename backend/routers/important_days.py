from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.important_day import ImportantDay
from schemas.important_day import ImportantDayCreate, ImportantDayUpdate, ImportantDayResponse
from middleware.auth import get_current_user
from datetime import date
import json
import asyncio
import random

router = APIRouter(tags=["Important Days"])


@router.get("", response_model=list[ImportantDayResponse])
async def get_important_days(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.user_id == current_user.id, ImportantDay.is_deleted == False)
        .order_by(ImportantDay.date.asc()).offset(skip).limit(limit)
    )
    return [ImportantDayResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/today", response_model=list[ImportantDayResponse])
async def get_today_important_days(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.user_id == current_user.id, ImportantDay.is_deleted == False)
    )
    # Filter for today (matching month and day, or matching exactly if not recurring)
    today_list = []
    for b in result.scalars().all():
        if b.is_recurring:
            if b.date.month == today.month and b.date.day == today.day:
                today_list.append(b)
        else:
            if b.date == today:
                today_list.append(b)
                
    return [ImportantDayResponse.model_validate(b) for b in today_list]


@router.get("/{important_day_id}", response_model=ImportantDayResponse)
async def get_important_day_by_id(
    important_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    return ImportantDayResponse.model_validate(important_day)


@router.post("", response_model=ImportantDayResponse, status_code=201)
async def create_important_day(
    data: ImportantDayCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        important_day = ImportantDay(
            title=data.title or "Untitled Important Day", 
            date=data.date or date.today(),
            type=data.type,
            is_recurring=data.is_recurring,
            custom_type=data.custom_type,
            notes=data.notes,
            gift_ideas=data.gift_ideas,
            celebration_plans=data.celebration_plans,
            reminder_notes=data.reminder_notes,
            message_draft=data.message_draft,
            recipient_email=data.recipient_email,
            email_subject=data.email_subject,
            email_message=data.email_message,
            email_enabled=data.email_enabled,
            delivery_type=data.delivery_type,
            send_time=data.send_time,
            auto_send_email=data.auto_send_email,
            email_send_time=data.email_send_time,
            reminders_json=None,  # Legacy field removed from schema
            reminder_enabled=data.reminder_enabled,
            reminder_type=data.reminder_type,
            reminder_value=data.reminder_value,
            reminder_unit=data.reminder_unit,
            reminder_time=data.reminder_time,
            notification_ids=data.notification_ids,
            user_id=current_user.id,
        )
        print("[DEBUG] Important Day created model instance:", important_day.__dict__)
        db.add(important_day)
        print("[DEBUG] db.add() success")
        await db.flush()
        print("[DEBUG] db.flush() success")
        await db.refresh(important_day)
        print("[DEBUG] db.refresh() success")
        return ImportantDayResponse.model_validate(important_day)
    except Exception as e:
        import traceback
        print(f"[Create Important Day Error] {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{important_day_id}", response_model=ImportantDayResponse)
async def update_important_day(
    important_day_id: int, data: ImportantDayUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Handle reminders separately
    if 'reminders' in update_data:
        reminders = update_data.pop('reminders')
        important_day.reminders_json = json.dumps(reminders) if reminders else None
    
    for key, value in update_data.items():
        setattr(important_day, key, value)
    
    await db.flush()
    await db.refresh(important_day)
    return ImportantDayResponse.model_validate(important_day)


@router.delete("/{important_day_id}", status_code=204)
async def delete_important_day(
    important_day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ImportantDay).where(ImportantDay.id == important_day_id, ImportantDay.user_id == current_user.id)
    )
    important_day = result.scalar_one_or_none()
    if not important_day:
        raise HTTPException(status_code=404, detail="Important Day not found")
    important_day.is_deleted = True
    await db.flush()


from pydantic import BaseModel
from services.email import send_custom_email

class GenerateWishRequest(BaseModel):
    type: str
    person_name: str
    custom_type: str | None = None

class TestEmailRequest(BaseModel):
    recipient_email: str
    email_subject: str | None = "KnoVault Test Email"
    email_message: str | None = "This is a test email sent from KnoVault Special Days module."

@router.post("/generate-wish")
async def generate_wish(req: GenerateWishRequest, current_user: User = Depends(get_current_user)):
    event_type = req.type
    if event_type.lower() == "custom" and req.custom_type:
        event_type = req.custom_type
        
    sender_name = current_user.full_name or current_user.username or "Your Friend"
    recip = req.person_name or "there"
    
    prompt = (
        f"Generate a warm, friendly email subject and a matching personalized wish/message for a {event_type} event. "
        f"The recipient's name is {recip}.\n"
        f"The sender's name is {sender_name}.\n"
        "Return the output STRICTLY as a JSON object with key 'subject' and key 'message'. "
        "Do not include any extra text, code blocks, or markdown formatting, just the raw JSON object.\n"
        "The message should be formatted professionally, including the sender's name at the end (e.g. Warmly, [Sender Name] from KnoVault).\n"
        "Example:\n"
        "{\n"
        "  \"subject\": \"Happy Birthday Emma! 🎂\",\n"
        "  \"message\": \"Dear Emma,\\n\\nWishing you a fantastic day...\\n\\nWarmly,\\nJohn from KnoVault\"\n"
        "}"
    )
    
    try:
        from services.ai_service import ai_service
        messages = [
            {"role": "system", "content": "You are a professional assistant that generates celebratory email wishes. Return raw JSON only."},
            {"role": "user", "content": prompt}
        ]
        
        raw_response = await asyncio.to_thread(
            ai_service._call_groq, messages, temperature=0.7, max_tokens=300
        )
        
        cleaned = raw_response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
            
        data = json.loads(cleaned)
        subj = data.get("subject", "")
        msg = data.get("message", "")
        if not subj or not msg:
            raise ValueError("Incomplete JSON response from AI")
        return {"subject": subj, "message": msg}
    except Exception as e:
        print(f"[Generate Wish Error] {e}")
        # Smart offline/fallback templates for 11 event categories
        t = event_type.lower()
        custom_t = (req.custom_type or "").lower()
        
        category = "custom"
        if "birthday" in t or "birthday" in custom_t:
            category = "birthday"
        elif "anniversary" in t or "anniversary" in custom_t:
            category = "anniversary"
        elif "graduation" in t or "graduation" in custom_t:
            category = "graduation"
        elif "wedding" in t or "wedding" in custom_t:
            category = "wedding"
        elif "new job" in t or "new job" in custom_t or "job" in t or "job" in custom_t:
            category = "new_job"
        elif "promotion" in t or "promotion" in custom_t:
            category = "promotion"
        elif "friendship" in t or "friendship" in custom_t:
            category = "friendship_day"
        elif "mother" in t or "mother" in custom_t:
            category = "mother_day"
        elif "father" in t or "father" in custom_t:
            category = "father_day"
        elif "valentin" in t or "valentin" in custom_t:
            category = "valentine_day"
            
        templates = {
            "birthday": [
                {
                    "subject": f"Happy Birthday, {recip}! 🎉",
                    "message": f"Dear {recip},\n\nWishing you a day filled with happiness, success, laughter, and unforgettable memories.\n\nMay this year bring new opportunities, great health, and endless joy.\n\nHave an amazing birthday!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Wishing you a wonderful Birthday, {recip}! 🎂✨",
                    "message": f"Dear {recip},\n\nOn this special day, I hope you are surrounded by joy, laughter, and the people you love.\n\nMay the year ahead be filled with achievements, peace, and beautiful moments.\n\nEnjoy your special day to the fullest!\n\nBest regards,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Cheers to another great year, {recip}! 🥂🎈",
                    "message": f"Dear {recip},\n\nHappy Birthday! May your day be as bright and wonderful as your spirit.\n\nHere's to celebrating you and wishing you success and happiness in all your future endeavors.\n\nHave a fantastic celebration!\n\nWarmly,\n{sender_name}\nKnoVault"
                }
            ],
            "anniversary": [
                {
                    "subject": f"Happy Anniversary, {recip}! ❤️🥂",
                    "message": f"Dear {recip},\n\nWishing you another year of love, companionship, and beautiful moments together.\n\nMay your bond grow stronger with each passing day.\n\nHappy Anniversary!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Cheers to your Anniversary, {recip}! 💍✨",
                    "message": f"Dear {recip},\n\nSending you warmest congratulations on your anniversary.\n\nMay your love story continue to inspire and be filled with endless joy and laughter.\n\nEnjoy this beautiful milestone!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "graduation": [
                {
                    "subject": f"Happy Graduation, {recip}! 🎓🌟",
                    "message": f"Dear {recip},\n\nHuge congratulations on your graduation! Your hard work, dedication, and resilience have paid off.\n\nWishing you the absolute best as you step into this exciting new chapter of life.\n\nSo proud of your achievement!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Congratulations on your Graduation, {recip}! 🎓🚀",
                    "message": f"Dear {recip},\n\nWhat an incredible milestone! You've successfully completed your graduation, and the future is yours to capture.\n\nMay you find success, growth, and joy in everything you do next.\n\nCheers to your bright future!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "wedding": [
                {
                    "subject": f"Congratulations on your Wedding, {recip}! 💍❤️",
                    "message": f"Dear {recip},\n\nWishing you a lifetime of love, happiness, and beautiful memories as you begin this new journey together.\n\nMay your marriage be filled with laughter, trust, and shared adventures.\n\nCongratulations on your wedding day!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Happy Married Life, {recip}! 🥂✨",
                    "message": f"Dear {recip},\n\nSending love and best wishes on your wedding!\n\nMay your bond grow sweeter and deeper with each passing day.\n\nCheers to a beautiful life together!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "new_job": [
                {
                    "subject": f"Congratulations on your New Job, {recip}! 💼🚀",
                    "message": f"Dear {recip},\n\nSo thrilled to hear about your new job! This is a fantastic step forward in your career.\n\nWishing you immense success, great team collaborations, and personal growth in your new role.\n\nYou're going to do amazing!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"All the best for your New Role, {recip}! 🌟👔",
                    "message": f"Dear {recip},\n\nCongratulations on landing the new job! Your dedication has led you to this great opportunity.\n\nWishing you a smooth transition and lots of success in your new workplace.\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "promotion": [
                {
                    "subject": f"Congratulations on your Promotion, {recip}! 🏆📈",
                    "message": f"Dear {recip},\n\nHuge congratulations on your well-deserved promotion!\n\nYour leadership, hard work, and dedication continue to make a huge impact.\n\nWishing you continued success in your elevated role!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Cheers to your new title, {recip}! ⭐🚀",
                    "message": f"Dear {recip},\n\nCongratulations on your promotion!\n\nThis is a true testament to your skill and effort. Wishing you all the best as you take on these new responsibilities.\n\nKeep shining!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "friendship_day": [
                {
                    "subject": f"Happy Friendship Day, {recip}! 🤝✨",
                    "message": f"Dear {recip},\n\nHappy Friendship Day! Thank you for being such an incredible friend and always supporting me.\n\nWishing you a day as wonderful and bright as the friendship we share.\n\nCheers to our friendship!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Wishing you a Happy Friendship Day, {recip}! 💛🎈",
                    "message": f"Dear {recip},\n\nOn this Friendship Day, I wanted to let you know how much your friendship means to me.\n\nMay our lives be filled with shared laughter, fun, and great moments.\n\nHave a fantastic day!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "mother_day": [
                {
                    "subject": f"Happy Mother's Day, {recip}! 🌸❤️",
                    "message": f"Dear {recip},\n\nWishing you a beautiful and relaxing Mother's Day!\n\nThank you for your infinite love, care, and guidance that lights up our lives.\n\nHave a wonderful celebration!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Happy Mother's Day to a wonderful Mom, {recip}! 💕🌼",
                    "message": f"Dear {recip},\n\nHappy Mother's Day! Sending you lots of love and gratitude today.\n\nYou are an inspiration, and I hope your day is filled with the joy you bring to others.\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "father_day": [
                {
                    "subject": f"Happy Father's Day, {recip}! 👔⭐",
                    "message": f"Dear {recip},\n\nWishing you a very Happy Father's Day!\n\nThank you for being a constant pillar of strength, wisdom, and support.\n\nHope you have an amazing day!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Wishing you a Happy Father's Day, {recip}! 🧢🎉",
                    "message": f"Dear {recip},\n\nHappy Father's Day! Wishing you a day of relaxation and fun.\n\nThank you for everything you do. You're appreciated more than words can say.\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "valentine_day": [
                {
                    "subject": f"Happy Valentine's Day, {recip}! ❤️🌹",
                    "message": f"Dear {recip},\n\nHappy Valentine's Day! Wishing you a day filled with sweetness, warmth, and love.\n\nThank you for bringing so much happiness and romance into my life.\n\nWith all my love,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Wishing you a lovely Valentine's Day, {recip}! 💖🍫",
                    "message": f"Dear {recip},\n\nHappy Valentine's Day!\n\nMay this day remind you of how special and loved you are. Sending you warmest thoughts and sweet wishes.\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ],
            "custom": [
                {
                    "subject": f"Warm wishes on your special day, {recip}! 🎉✨",
                    "message": f"Dear {recip},\n\nSending you my warmest thoughts and celebration wishes on this special occasion ({event_type}).\n\nMay this day bring you happiness, success, and wonderful memories to cherish.\n\nHave a great celebration!\n\nWarm wishes,\n{sender_name}\nKnoVault"
                },
                {
                    "subject": f"Congratulations and best wishes, {recip}! 🥂🎈",
                    "message": f"Dear {recip},\n\nHappy Celebration!\n\nWishing you joy, prosperity, and peace as you celebrate this beautiful day.\n\nCheers to you!\n\nBest regards,\n{sender_name}\nKnoVault"
                }
            ]
        }
        
        choice = random.choice(templates[category])
        return choice

@router.post("/send-test-email")
async def send_test_email(req: TestEmailRequest):
    subject = (req.email_subject or "").strip() or "KnoVault Test Email"
    message = (req.email_message or "").strip() or "This is a test email sent from KnoVault Special Days module."
    success, detail = await send_custom_email(req.recipient_email, subject, message)
    if success:
        return {"message": "Test email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail=detail)
