import uuid
import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from middleware.auth import get_current_user
from models.user import User
from database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/files", tags=["Files"])

UPLOAD_ROOT = "uploads"
UPLOAD_IMAGES_DIR = os.path.join(UPLOAD_ROOT, "images")
UPLOAD_VOICE_DIR = os.path.join(UPLOAD_ROOT, "voice")
UPLOAD_DOCS_DIR = os.path.join(UPLOAD_ROOT, "documents")

# Ensure target directories exist
os.makedirs(UPLOAD_IMAGES_DIR, exist_ok=True)
os.makedirs(UPLOAD_VOICE_DIR, exist_ok=True)
os.makedirs(UPLOAD_DOCS_DIR, exist_ok=True)


async def save_upload_file(upload_file: UploadFile, destination_dir: str) -> str:
    """Helper to save uploaded file and return relative path"""
    file_ext = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    dest_path = os.path.join(destination_dir, unique_filename)
    
    async with aiofiles.open(dest_path, "wb") as out_file:
        while content := await upload_file.read(1024 * 1024):  # 1MB chunks
            await out_file.write(content)
            
    # Normalize paths to use forward slashes
    relative_path = os.path.relpath(dest_path, ".").replace("\\", "/")
    return relative_path


@router.post("/image", response_model=dict)
async def upload_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload image attachment"""
    from routers.profile import check_storage_quota
    await check_storage_quota(db, current_user.id)

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")
    
    try:
        file_path = await save_upload_file(file, UPLOAD_IMAGES_DIR)
        
        # Calculate file size
        file_size = os.path.getsize(file_path)
        
        return {
            "id": int(uuid.uuid4().int & 0x7FFFFFFF),  # Positive 32-bit int
            "file_name": file.filename,
            "file_path": file_path,
            "content_type": file.content_type,
            "file_size": file_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")


@router.post("/voice", response_model=dict)
async def upload_voice(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload voice note recording"""
    from routers.profile import check_storage_quota
    await check_storage_quota(db, current_user.id)

    try:
        file_path = await save_upload_file(file, UPLOAD_VOICE_DIR)
        file_size = os.path.getsize(file_path)
        
        return {
            "id": int(uuid.uuid4().int & 0x7FFFFFFF),
            "file_name": file.filename,
            "file_path": file_path,
            "content_type": file.content_type or "audio/m4a",
            "file_size": file_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice upload failed: {str(e)}")


@router.post("", response_model=dict)
async def upload_general_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload PDF, Word, or other text documents"""
    from routers.profile import check_storage_quota
    await check_storage_quota(db, current_user.id)

    try:
        file_path = await save_upload_file(file, UPLOAD_DOCS_DIR)
        file_size = os.path.getsize(file_path)
        
        return {
            "id": int(uuid.uuid4().int & 0x7FFFFFFF),
            "file_name": file.filename,
            "file_path": file_path,
            "content_type": file.content_type or "application/octet-stream",
            "file_size": file_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
