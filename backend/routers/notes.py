import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from database import get_db
from models.user import User
from models.note import Note, ChecklistItem, FieldNote, VoiceNote, NoteCategory
from schemas.note import NoteCreate, NoteUpdate, NoteResponse, VoiceNoteResponse, CategoryResponse, CategoryCreate, CategoryRename
from middleware.auth import get_current_user
from utils.encryption import encrypt_text, decrypt_text
import os
import aiofiles

router = APIRouter(prefix="/api/notes", tags=["Notes"])

UPLOAD_DIR = "uploads/voice"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _prepare_note_response(note: Note) -> NoteResponse:
    resp = NoteResponse.model_validate(note)
    if resp.is_secure and resp.content:
        resp.content = decrypt_text(resp.content)
    return resp


def _note_query(user_id: int):
    return (
        select(Note)
        .where(Note.user_id == user_id)
        .options(
            selectinload(Note.checklist_items),
            selectinload(Note.field_notes),
            selectinload(Note.voice_note),
        )
    )


@router.get("", response_model=list[NoteResponse])
async def get_notes(
    category: str | None = None,
    search: str | None = None,
    note_type: str | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _note_query(current_user.id)

    if category:
        query = query.where(Note.category == category)
    if note_type:
        query = query.where(Note.note_type == note_type)
    if search:
        query = query.where(
            or_(
                Note.title.ilike(f"%{search}%"),
                Note.content.ilike(f"%{search}%"),
            )
        )

    query = query.order_by(Note.is_favorite.desc(), Note.updated_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    notes = result.scalars().unique().all()
    return [_prepare_note_response(n) for n in notes]


@router.get("/favorites", response_model=list[NoteResponse])
async def get_favorite_notes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _note_query(current_user.id).where(Note.is_favorite == True)
    query = query.order_by(Note.updated_at.desc())
    result = await db.execute(query)
    notes = result.scalars().unique().all()
    return [_prepare_note_response(n) for n in notes]


@router.get("/categories", response_model=list[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get counts from existing notes
    notes_query = await db.execute(
        select(Note.category, func.count(Note.id))
        .where(Note.user_id == current_user.id)
        .group_by(Note.category)
    )
    usage = {row[0]: row[1] for row in notes_query.all()}
    
    # Get custom created categories
    custom_query = await db.execute(
        select(NoteCategory.name)
        .where(NoteCategory.user_id == current_user.id)
    )
    custom_names = set(custom_query.scalars().all())
    
    # Built-in categories
    built_in = {"General", "Personal", "Work", "Study", "Passwords", "Finance", "Ideas", "Other"}
    
    all_names = set(usage.keys()) | custom_names | built_in
    
    result = []
    for name in all_names:
        if not name:
            continue
        result.append({
            "name": name,
            "count": usage.get(name, 0),
            "is_custom": name not in built_in
        })
        
    # Sort alphabetically
    result.sort(key=lambda x: x["name"].lower())
    return result

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
        
    # Check if exists
    existing = await db.execute(
        select(NoteCategory).where(NoteCategory.name == name, NoteCategory.user_id == current_user.id)
    )
    if not existing.scalar_one_or_none():
        new_cat = NoteCategory(name=name, user_id=current_user.id)
        db.add(new_cat)
        await db.flush()
        
    return {"name": name, "count": 0, "is_custom": True}

@router.put("/categories/{name}", response_model=CategoryResponse)
async def rename_category(
    name: str,
    data: CategoryRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_name = data.new_name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="New name cannot be empty")
        
    if name == new_name:
        return {"name": name, "count": 0, "is_custom": True} # Placeholder count
        
    # Update custom category registry if it exists
    custom = await db.execute(
        select(NoteCategory).where(NoteCategory.name == name, NoteCategory.user_id == current_user.id)
    )
    cat = custom.scalar_one_or_none()
    if cat:
        cat.name = new_name
    else:
        # If they rename a built-in or implicitly created category, register the new one
        db.add(NoteCategory(name=new_name, user_id=current_user.id))
        
    # Ensure no duplicates in registry
    existing_new = await db.execute(
        select(NoteCategory).where(NoteCategory.name == new_name, NoteCategory.user_id == current_user.id, NoteCategory.id != (cat.id if cat else -1))
    )
    if existing_new.scalar_one_or_none() and cat:
        await db.delete(cat) # Merge duplicates
        
    # Bulk update notes
    await db.execute(
        Note.__table__.update()
        .where(Note.category == name, Note.user_id == current_user.id)
        .values(category=new_name)
    )
    await db.flush()
    return {"name": new_name, "count": 0, "is_custom": True}

@router.delete("/categories/{name}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Remove from custom registry
    custom = await db.execute(
        select(NoteCategory).where(NoteCategory.name == name, NoteCategory.user_id == current_user.id)
    )
    cat = custom.scalar_one_or_none()
    if cat:
        await db.delete(cat)
        
    # Bulk update notes to 'General'
    await db.execute(
        Note.__table__.update()
        .where(Note.category == name, Note.user_id == current_user.id)
        .values(category="General")
    )
    await db.flush()


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        _note_query(current_user.id).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _prepare_note_response(note)


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_secure = data.is_secure
    category = data.category
    if is_secure:
        category = "Secure"
    elif category == "Secure":
        is_secure = True

    content = data.content
    if is_secure and content:
        content = encrypt_text(content)

    note = Note(
        title=data.title,
        content=content,
        category=category,
        is_secure=is_secure,
        is_pinned=data.is_pinned,
        is_completed=data.is_completed,
        is_favorite=data.is_favorite,
        note_type=data.note_type,
        user_id=current_user.id,
    )
    db.add(note)
    await db.flush()

    if data.checklist_items:
        for idx, item in enumerate(data.checklist_items):
            db.add(ChecklistItem(
                note_id=note.id,
                text=item.text,
                completed=item.completed,
                order=item.order or idx,
            ))

    if data.field_notes:
        for idx, field in enumerate(data.field_notes):
            db.add(FieldNote(
                note_id=note.id,
                label=field.label,
                value=field.value,
                order=field.order or idx,
            ))

    await db.flush()

    result = await db.execute(
        _note_query(current_user.id).where(Note.id == note.id)
    )
    return _prepare_note_response(result.scalar_one())


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        _note_query(current_user.id).where(Note.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = data.model_dump(exclude_unset=True)

    # Sync is_secure and category
    has_is_secure = "is_secure" in update_data
    has_category = "category" in update_data
    if has_is_secure and has_category:
        if update_data["is_secure"]:
            update_data["category"] = "Secure"
        elif update_data["category"] == "Secure":
            update_data["category"] = "General"
    elif has_is_secure:
        if update_data["is_secure"]:
            update_data["category"] = "Secure"
        else:
            if note.category == "Secure":
                update_data["category"] = "General"
    elif has_category:
        if update_data["category"] == "Secure":
            update_data["is_secure"] = True
        else:
            if note.is_secure:
                update_data["is_secure"] = False

    # Determine final security state
    final_is_secure = update_data.get("is_secure", note.is_secure)

    # Handle content encryption/decryption
    if "content" in update_data:
        if final_is_secure and update_data["content"]:
            update_data["content"] = encrypt_text(update_data["content"])
    else:
        # Toggling security state without explicit content update
        if final_is_secure and not note.is_secure:
            if note.content:
                update_data["content"] = encrypt_text(note.content)
        elif not final_is_secure and note.is_secure:
            if note.content:
                update_data["content"] = decrypt_text(note.content)

    # Handle checklist items replacement
    if "checklist_items" in update_data:
        items_data = update_data.pop("checklist_items")
        # Clear collection and let cascade delete-orphan handle removal
        note.checklist_items.clear()
        if items_data:
            for idx, item_data in enumerate(items_data):
                note.checklist_items.append(ChecklistItem(
                    text=item_data["text"],
                    completed=item_data.get("completed", False),
                    order=item_data.get("order", idx),
                ))

    # Handle field notes replacement
    if "field_notes" in update_data:
        fields_data = update_data.pop("field_notes")
        # Clear collection and let cascade delete-orphan handle removal
        note.field_notes.clear()
        if fields_data:
            for idx, field_data in enumerate(fields_data):
                note.field_notes.append(FieldNote(
                    label=field_data["label"],
                    value=field_data["value"],
                    order=field_data.get("order", idx),
                ))

    for key, value in update_data.items():
        setattr(note, key, value)

    await db.flush()

    result = await db.execute(
        _note_query(current_user.id).where(Note.id == note.id)
    )
    return _prepare_note_response(result.scalar_one())


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)


@router.post("/{note_id}/voice", response_model=VoiceNoteResponse)
async def upload_voice_note(
    note_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Delete existing voice note if any
    existing = await db.execute(
        select(VoiceNote).where(VoiceNote.note_id == note_id)
    )
    old_voice = existing.scalar_one_or_none()
    if old_voice:
        await db.delete(old_voice)

    voice_note = VoiceNote(
        note_id=note_id,
        audio_path=filepath,
    )
    db.add(voice_note)
    await db.flush()
    await db.refresh(voice_note)

    return VoiceNoteResponse.model_validate(voice_note)


@router.get("/count/total", response_model=dict)
async def get_notes_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count(Note.id)).where(Note.user_id == current_user.id)
    )
    count = result.scalar()
    return {"count": count}
