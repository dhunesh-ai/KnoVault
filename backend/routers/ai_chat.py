from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
        # 1. Fetch User Context (Non-Secure data only)
        if data.context:
            context = data.context
        else:
            context = await ai_service.get_user_context(db, current_user.id)

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

        # 4. Save to history
        chat_entry = AIChat(
            user_id=current_user.id,
            message=data.message,
            response=ai_response,
        )
        db.add(chat_entry)
        await db.commit() # Use commit instead of flush for persistence
        await db.refresh(chat_entry)
        
        return AIChatResponse.model_validate(chat_entry)
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
        
        if note.category == "Secure":
            return {"summary": "Secure notes are protected and cannot be summarized by AI."}
        
        text = note.content
    
    if not text:
        raise HTTPException(status_code=400, detail="Missing note content")
    
    summary = await ai_service.summarize_note(text)
    return {"summary": summary}
