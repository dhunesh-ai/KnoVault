from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from database import get_db
from models.user import User
from models.ai_chat import AIChat
from models.note import Note
from schemas.ai_chat import AIChatRequest, AIChatResponse, AIChatHistoryResponse
from middleware.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])


@router.post("/chat", response_model=AIChatResponse)
async def chat(
    data: AIChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        # Pre-flight security check for secure notes
        lower_msg = data.message.lower()
        has_secure_kw = any(kw in lower_msg for kw in ["secure note", "private note", "locked note", "secure notes", "private notes", "locked notes"])
        if not has_secure_kw:
            # Check combinations
            has_sec = any(w in lower_msg for w in ["secure", "private", "locked"])
            has_not = any(w in lower_msg for w in ["note", "notes"])
            if has_sec and has_not:
                has_secure_kw = True

        if not has_secure_kw:
            # Check if user message mentions any secure note title
            secure_notes_query = await db.execute(
                select(Note.title).where(
                    Note.user_id == current_user.id,
                    or_(Note.is_secure == True, Note.category == "Secure")
                )
            )
            secure_titles = secure_notes_query.scalars().all()
            for title in secure_titles:
                if title.lower().strip() and title.lower().strip() in lower_msg:
                    has_secure_kw = True
                    break

        if has_secure_kw:
            warning_msg = "For your privacy, Secure Notes are protected with end-to-end encryption and are not accessible to KnoVault AI. Please unlock and view them directly from the Secure Notes section."
            
            # Save to history
            chat_entry = AIChat(
                user_id=current_user.id,
                message=data.message,
                response=warning_msg,
            )
            db.add(chat_entry)
            await db.commit()
            await db.refresh(chat_entry)
            return AIChatResponse.model_validate(chat_entry)

        # 1. Fetch User Context from Database
        db_context = await ai_service.get_user_context(db, current_user.id, user_message=data.message)
        if data.context:
            context = f"{db_context}\n\nCLIENT MEMORY & DASHBOARD CONTEXT:\n{data.context}"
        else:
            context = db_context

        # 2. Fetch recent history for conversational continuity
        history_result = await db.execute(
            select(AIChat)
            .where(AIChat.user_id == current_user.id)
            .order_by(AIChat.created_at.desc())
            .limit(5)
        )
        recent_chats = history_result.scalars().all()
        history = []
        for c in reversed(recent_chats):
            history.append({"role": "user", "content": c.message})
            history.append({"role": "assistant", "content": c.response})

        # 3. Get AI Response
        ai_response = await ai_service.chat_with_ai(
            message=data.message, 
            context=context, 
            history=history,
            custom_system_prompt=data.system_prompt
        )

        # If AI service returned an error string that starts with "Authentication failed" or "AI is temporarily",
        # we might want to return a 503 or 401 instead of saving it?
        # For now, let's just save it or raise an error if it's a known failure.
        if "Authentication failed" in ai_response or "temporarily unavailable" in ai_response:
            raise HTTPException(status_code=503, detail=ai_response)

        # 4. Save to history (if not temporary)
        if not data.is_temporary:
            chat_entry = AIChat(
                user_id=current_user.id,
                message=data.message,
                response=ai_response,
            )
            db.add(chat_entry)
            await db.commit() # Use commit instead of flush for persistence
            await db.refresh(chat_entry)
            return AIChatResponse.model_validate(chat_entry)
        else:
            from datetime import datetime
            return AIChatResponse(
                id=0,
                message=data.message,
                response=ai_response,
                created_at=datetime.now()
            )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Don't expose internal errors
        raise HTTPException(
            status_code=500, 
            detail="AI is temporarily unavailable. Our engineers have been notified."
        )


@router.get("/history", response_model=AIChatHistoryResponse)
async def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AIChat).where(AIChat.user_id == current_user.id)
        .order_by(AIChat.created_at.asc()).offset(skip).limit(limit)
    )
    chats = result.scalars().all()
    return AIChatHistoryResponse(
        chats=[AIChatResponse.model_validate(c) for c in chats],
        total=len(chats),
    )


@router.delete("/history", status_code=204)
async def clear_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # More efficient delete
    from sqlalchemy import delete
    await db.execute(delete(AIChat).where(AIChat.user_id == current_user.id))
    await db.commit()


@router.post("/suggest-tasks", response_model=dict)
async def suggest_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = await ai_service.get_user_context(db, current_user.id)
    suggestions = await ai_service.suggest_tasks(context)
    return {"suggestions": suggestions}


@router.post("/summarize", response_model=dict)
async def summarize_note(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    text = data.get("text")
    note_id = data.get("note_id")
    
    if note_id:
        # Fetch note to check category
        result = await db.execute(select(Note).where(Note.id == note_id))
        note = result.scalar_one_or_none()
        if not note or note.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if note.category == "Secure" or note.is_secure:
            return {"summary": "For your privacy, Secure Notes are protected with end-to-end encryption and are not accessible to KnoVault AI. Please unlock and view them directly from the Secure Notes section."}
        
        text = note.content
    
    if not text:
        raise HTTPException(status_code=400, detail="Missing note content")
    
    summary = await ai_service.summarize_note(text)
    return {"summary": summary}
