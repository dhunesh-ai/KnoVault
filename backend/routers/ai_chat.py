import uuid
import time
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, delete
from sqlalchemy.orm import selectinload
from database import get_db
from models.user import User
from models.ai_chat import AIChat, AIConversation, AIConversationMessage
from models.note import Note
from schemas.ai_chat import (
    AIChatRequest,
    AIChatResponse,
    AIChatHistoryResponse,
    AIConversationSchema,
    AIConversationSummarySchema,
    AIConversationCreate,
    AIConversationUpdate,
    AIConversationMessageSchema,
)
from middleware.auth import get_current_user
from services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Chat"])

# Deduplication cache for /api/ai/chat: key -> (timestamp, response_task_or_response)
recent_chat_requests: dict[tuple, tuple[float, any]] = {}
recent_chat_lock = asyncio.Lock()


# ── CONVERSATIONS CRUD ENDPOINTS ──────────────────────────────────────────

@router.get("/conversations", response_model=list[AIConversationSummarySchema])
async def list_conversations(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.is_pinned.desc(), AIConversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    summaries = []
    for conv in conversations:
        last_msg_res = await db.execute(
            select(AIConversationMessage.content)
            .where(AIConversationMessage.conversation_id == conv.id)
            .order_by(AIConversationMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_res.scalar_one_or_none()
        summaries.append(
            AIConversationSummarySchema(
                id=conv.id,
                title=conv.title,
                is_pinned=conv.is_pinned,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                last_message=last_msg,
            )
        )

    print(
        f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
        f"Endpoint: GET /api/ai/conversations | Rows Returned: {len(summaries)}"
    )
    return summaries


@router.post("/conversations", response_model=AIConversationSchema)
async def create_conversation(
    data: AIConversationCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    conv_id = data.id if data.id else f"conv_{uuid.uuid4().hex[:16]}"
    title = data.title.strip() if data.title and data.title.strip() else "New Conversation"

    # Check if existing conversation with same ID exists
    existing = await db.execute(
        select(AIConversation).where(AIConversation.id == conv_id)
    )
    if existing.scalar_one_or_none():
        conv = existing.scalar_one()
    else:
        conv = AIConversation(
            id=conv_id,
            user_id=current_user.id,
            title=title,
            is_pinned=False,
        )
        db.add(conv)
        await db.commit()

    # Reload with messages
    res = await db.execute(
        select(AIConversation)
        .options(selectinload(AIConversation.messages))
        .where(AIConversation.id == conv.id)
    )
    loaded_conv = res.scalar_one()

    print(
        f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
        f"Endpoint: POST /api/ai/conversations | Conversation ID: {loaded_conv.id} | "
        f"Title: '{loaded_conv.title}'"
    )
    return AIConversationSchema.model_validate(loaded_conv)


@router.get("/conversations/{conversation_id}", response_model=AIConversationSchema)
async def get_conversation(
    conversation_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    result = await db.execute(
        select(AIConversation)
        .options(selectinload(AIConversation.messages))
        .where(AIConversation.id == conversation_id, AIConversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    print(
        f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
        f"Endpoint: GET /api/ai/conversations/{conversation_id} | Message Count: {len(conv.messages)}"
    )
    return AIConversationSchema.model_validate(conv)


@router.patch("/conversations/{conversation_id}", response_model=AIConversationSchema)
async def update_conversation(
    conversation_id: str,
    data: AIConversationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    result = await db.execute(
        select(AIConversation)
        .options(selectinload(AIConversation.messages))
        .where(AIConversation.id == conversation_id, AIConversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if data.title is not None:
        conv.title = data.title.strip() if data.title.strip() else "Untitled Chat"
    if data.is_pinned is not None:
        conv.is_pinned = data.is_pinned

    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(conv)

    print(
        f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
        f"Endpoint: PATCH /api/ai/conversations/{conversation_id} | Title: '{conv.title}' | "
        f"Is Pinned: {conv.is_pinned}"
    )
    return AIConversationSchema.model_validate(conv)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    result = await db.execute(
        select(AIConversation)
        .where(AIConversation.id == conversation_id, AIConversation.user_id == current_user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()

    print(
        f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
        f"Endpoint: DELETE /api/ai/conversations/{conversation_id} | Status: Success"
    )


# ── MAIN CHAT ENDPOINT ─────────────────────────────────────────────────────

@router.post("/chat", response_model=AIChatResponse)
async def chat(
    data: AIChatRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    platform = request.headers.get("user-agent", "Unknown Platform")
    now_ts = time.time()
    cache_key = (current_user.id, data.conversation_id or "temp", data.message.strip())

    async with recent_chat_lock:
        # Clean up stale cache entries (>10 seconds)
        for k in list(recent_chat_requests.keys()):
            if now_ts - recent_chat_requests[k][0] > 10.0:
                recent_chat_requests.pop(k, None)

        if cache_key in recent_chat_requests:
            cached_ts, cached_val = recent_chat_requests[cache_key]
            if now_ts - cached_ts < 3.0:
                print(f"[AI_DEDUP] Duplicate request suppressed for User ID: {current_user.id} | Conv: {data.conversation_id}")
                if isinstance(cached_val, AIChatResponse):
                    return cached_val
                elif isinstance(cached_val, asyncio.Task):
                    try:
                        return await asyncio.shield(cached_val)
                    except Exception:
                        pass

    try:
        # Pre-flight security check for secure notes
        lower_msg = data.message.lower()
        has_secure_kw = any(
            kw in lower_msg
            for kw in [
                "secure note",
                "private note",
                "locked note",
                "secure notes",
                "private notes",
                "locked notes",
            ]
        )
        if not has_secure_kw:
            has_sec = any(w in lower_msg for w in ["secure", "private", "locked"])
            has_not = any(w in lower_msg for w in ["note", "notes"])
            if has_sec and has_not:
                has_secure_kw = True

        if not has_secure_kw:
            secure_notes_query = await db.execute(
                select(Note.title).where(
                    Note.user_id == current_user.id,
                    or_(Note.is_secure == True, Note.category == "Secure"),
                )
            )
            secure_titles = secure_notes_query.scalars().all()
            for title in secure_titles:
                if title.lower().strip() and title.lower().strip() in lower_msg:
                    has_secure_kw = True
                    break

        if has_secure_kw:
            warning_msg = (
                "For your privacy, Secure Notes are protected with end-to-end encryption "
                "and are not accessible to KnoVault AI. Please unlock and view them directly "
                "from the Secure Notes section."
            )
            now_dt = datetime.now(timezone.utc)
            return AIChatResponse(
                id=f"msg_{uuid.uuid4().hex[:16]}",
                conversation_id=data.conversation_id or f"temp_{uuid.uuid4().hex[:16]}",
                message=data.message,
                response=warning_msg,
                title="Security Warning",
                created_at=now_dt,
            )

        # 1. Fetch User Context from Database
        db_context = await ai_service.get_user_context(
            db, current_user.id, user_message=data.message
        )
        if data.context:
            context = f"{db_context}\n\nCLIENT MEMORY & DASHBOARD CONTEXT:\n{data.context}"
        else:
            context = db_context

        # 2. Temporary Chat handling (No DB storage)
        if data.is_temporary:
            ai_response = await ai_service.chat_with_ai(
                message=data.message,
                context=context,
                history=[],
                custom_system_prompt=data.system_prompt,
            )
            now_dt = datetime.now(timezone.utc)
            print(
                f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
                f"Endpoint: POST /api/ai/chat | Temporary Chat: True"
            )
            return AIChatResponse(
                id=f"temp_msg_{uuid.uuid4().hex[:16]}",
                conversation_id="temporary_chat",
                message=data.message,
                response=ai_response,
                title="Temporary Chat",
                created_at=now_dt,
            )

        # 3. Persistent Conversation Resolution
        conversation = None
        if data.conversation_id:
            result = await db.execute(
                select(AIConversation)
                .options(selectinload(AIConversation.messages))
                .where(
                    AIConversation.id == data.conversation_id,
                    AIConversation.user_id == current_user.id,
                )
            )
            conversation = result.scalar_one_or_none()

        if not conversation:
            # Auto-create conversation thread
            auto_title = (
                data.message[:25] + "..." if len(data.message) > 25 else data.message
            )
            conv_id = data.conversation_id or f"conv_{uuid.uuid4().hex[:16]}"
            conversation = AIConversation(
                id=conv_id,
                user_id=current_user.id,
                title=auto_title,
                is_pinned=False,
            )
            db.add(conversation)
            await db.commit()
            # Reload conversation with messages relationship
            result = await db.execute(
                select(AIConversation)
                .options(selectinload(AIConversation.messages))
                .where(AIConversation.id == conv_id)
            )
            conversation = result.scalar_one()

        # 4. Fetch Message History for Conversation Continuity
        history = []
        if conversation.messages:
            # Sort asc by created_at and limit last 10 messages for AI context window
            sorted_msgs = sorted(conversation.messages, key=lambda m: m.created_at)
            for m in sorted_msgs[-10:]:
                history.append({"role": m.role, "content": m.content})

        # 5. Call AI Service
        ai_response = await ai_service.chat_with_ai(
            message=data.message,
            context=context,
            history=history,
            custom_system_prompt=data.system_prompt,
        )

        if "Authentication failed" in ai_response or "temporarily unavailable" in ai_response:
            raise HTTPException(status_code=503, detail=ai_response)

        # 6. Save User & Assistant Messages
        now_dt = datetime.now(timezone.utc)
        user_msg_obj = AIConversationMessage(
            id=f"msg_{uuid.uuid4().hex[:16]}",
            conversation_id=conversation.id,
            user_id=current_user.id,
            role="user",
            content=data.message,
            created_at=now_dt,
        )
        assistant_msg_obj = AIConversationMessage(
            id=f"msg_{uuid.uuid4().hex[:16]}",
            conversation_id=conversation.id,
            user_id=current_user.id,
            role="assistant",
            content=ai_response,
            created_at=now_dt,
        )

        db.add(user_msg_obj)
        db.add(assistant_msg_obj)

        # Auto-name conversation if title is default
        if conversation.title in ["New Conversation", "First Conversation", "Untitled Chat"]:
            conversation.title = (
                data.message[:25] + "..." if len(data.message) > 25 else data.message
            )

        conversation.updated_at = now_dt
        await db.commit()

        user_msg_schema = AIConversationMessageSchema.model_validate(user_msg_obj)
        assistant_msg_schema = AIConversationMessageSchema.model_validate(assistant_msg_obj)

        print(
            f"[AI_LOG] User ID: {current_user.id} | Platform: {platform[:30]} | "
            f"Endpoint: POST /api/ai/chat | Conversation ID: {conversation.id} | "
            f"User Msg ID: {user_msg_obj.id} | Assistant Msg ID: {assistant_msg_obj.id} | "
            f"Title: '{conversation.title}'"
        )

        final_res = AIChatResponse(
            id=assistant_msg_obj.id,
            conversation_id=conversation.id,
            message=data.message,
            response=ai_response,
            title=conversation.title,
            user_message=user_msg_schema,
            assistant_message=assistant_msg_schema,
            created_at=now_dt,
        )
        recent_chat_requests[cache_key] = (time.time(), final_res)
        return final_res

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="AI is temporarily unavailable. Our engineers have been notified.",
        )


@router.get("/history", response_model=AIChatHistoryResponse)
async def get_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(AIChat)
        .where(AIChat.user_id == current_user.id)
        .order_by(AIChat.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    chats = result.scalars().all()
    return AIChatHistoryResponse(
        chats=[
            AIChatResponse(
                id=c.id,
                conversation_id="legacy",
                message=c.message,
                response=c.response,
                title="Legacy Chat",
                created_at=c.created_at,
            )
            for c in chats
        ],
        total=len(chats),
    )


@router.delete("/history", status_code=204)
async def clear_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(delete(AIChat).where(AIChat.user_id == current_user.id))
    await db.execute(delete(AIConversation).where(AIConversation.user_id == current_user.id))
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
        result = await db.execute(select(Note).where(Note.id == note_id))
        note = result.scalar_one_or_none()
        if not note or note.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Note not found")

        if note.category == "Secure" or note.is_secure:
            return {
                "summary": (
                    "For your privacy, Secure Notes are protected with end-to-end encryption "
                    "and are not accessible to KnoVault AI. Please unlock and view them directly "
                    "from the Secure Notes section."
                )
            }

        text = note.content

    if not text:
        raise HTTPException(status_code=400, detail="Missing note content")

    summary = await ai_service.summarize_note(text)
    return {"summary": summary}
