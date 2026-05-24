from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models.user import User
from models.project_task import ProjectTask
from schemas.project_task import ProjectTaskCreate, ProjectTaskUpdate, ProjectTaskResponse
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectTaskResponse])
async def get_projects(
    completed: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(ProjectTask).where(ProjectTask.user_id == current_user.id)
    
    if completed is not None:
        query = query.where(ProjectTask.completed == completed)
        
    query = query.order_by(ProjectTask.completed.asc(), ProjectTask.deadline.asc().nullslast(), ProjectTask.created_at.desc())
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().all()
    return [ProjectTaskResponse.model_validate(p) for p in projects]


@router.post("", response_model=ProjectTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectTaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Auto-calculate progress if subtasks are provided on creation
    progress = data.progress
    completed = False
    status_val = data.status
    
    if data.subtasks:
        total_subtasks = len(data.subtasks)
        completed_subtasks = sum(1 for s in data.subtasks if s.completed)
        progress = round((completed_subtasks / total_subtasks) * 100) if total_subtasks > 0 else 0
        if progress == 100:
            completed = True
            status_val = "Completed"
    else:
        if progress == 100:
            completed = True
            status_val = "Completed"
            
    project = ProjectTask(
        title=data.title,
        description=data.description,
        completed=completed,
        priority=data.priority,
        status=status_val,
        progress=progress,
        deadline=data.deadline,
        subtasks=[s.model_dump() for s in data.subtasks],
        user_id=current_user.id
    )
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return ProjectTaskResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectTaskResponse)
async def update_project(
    project_id: int,
    data: ProjectTaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectTask).where(ProjectTask.id == project_id, ProjectTask.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project task not found")

    update_dict = data.model_dump(exclude_unset=True)

    # Perform updates
    for key, value in update_dict.items():
        if key == "subtasks" and value is not None:
            setattr(project, key, value)
        else:
            setattr(project, key, value)

    # Re-calculate completions and progress based on subtasks if they were updated
    if "subtasks" in update_dict and project.subtasks:
        total_subtasks = len(project.subtasks)
        completed_subtasks = sum(1 for s in project.subtasks if s.get("completed", False))
        project.progress = round((completed_subtasks / total_subtasks) * 100) if total_subtasks > 0 else 0
        
        if project.progress == 100:
            project.completed = True
            project.status = "Completed"
        else:
            # If it was completed but now isn't
            if project.completed:
                project.completed = False
                project.status = "In Progress"
    else:
        # If no subtasks, or not updated, check manual completed/progress
        if "completed" in update_dict:
            if update_dict["completed"]:
                project.progress = 100
                project.status = "Completed"
            else:
                if project.progress == 100:
                    project.progress = 0
                    project.status = "Pending"
        elif "progress" in update_dict:
            if project.progress == 100:
                project.completed = True
                project.status = "Completed"
            else:
                project.completed = False
                if project.status == "Completed":
                    project.status = "In Progress"

    # Status completion check
    if "status" in update_dict:
        if update_dict["status"] == "Completed":
            project.completed = True
            project.progress = 100
        else:
            if project.completed:
                project.completed = False
                if "progress" not in update_dict:
                    project.progress = 50 # intermediate fallback

    await db.flush()
    await db.refresh(project)
    return ProjectTaskResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProjectTask).where(ProjectTask.id == project_id, ProjectTask.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project task not found")
    await db.delete(project)
