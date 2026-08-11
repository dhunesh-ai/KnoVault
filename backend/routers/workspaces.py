import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from database import get_db
from models.user import User
from models.workspace import (
    Workspace, WorkspaceMember, WorkspaceNote, WorkspaceTask, WorkspaceGoal,
    WorkspaceDiscussion, WorkspaceKnowledge, WorkspaceMeeting, WorkspaceIdea,
    WorkspaceActivity, WorkspaceAnalytics, WorkspaceEvent, WorkspaceInvite
)
from schemas.workspace import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    WorkspaceMemberResponse, WorkspaceMemberInvite, WorkspaceMemberUpdate,
    WorkspaceNoteCreate, WorkspaceNoteUpdate, WorkspaceNoteResponse, WorkspaceNoteCommentCreate,
    WorkspaceTaskCreate, WorkspaceTaskUpdate, WorkspaceTaskResponse, WorkspaceTaskCommentCreate,
    WorkspaceGoalCreate, WorkspaceGoalUpdate, WorkspaceGoalResponse,
    WorkspaceDiscussionCreate, WorkspaceDiscussionUpdate, WorkspaceDiscussionResponse,
    WorkspaceKnowledgeCreate, WorkspaceKnowledgeUpdate, WorkspaceKnowledgeResponse,
    WorkspaceMeetingCreate, WorkspaceMeetingUpdate, WorkspaceMeetingResponse,
    WorkspaceIdeaCreate, WorkspaceIdeaUpdate, WorkspaceIdeaResponse,
    WorkspaceEventCreate, WorkspaceEventUpdate, WorkspaceEventResponse,
    WorkspaceActivityResponse, WorkspaceLeaderboardResponse, WorkspaceAnalyticsResponse,
    WorkspaceAIAssistantRequest, WorkspaceAIAssistantResponse,
    WorkspaceInviteCreate, WorkspaceInviteResponse
)
from middleware.auth import get_current_user
from services.ai_service import ai_service
from services.notification_service import create_workspace_notification
import uuid
from datetime import timezone

def convert_to_utc_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


router = APIRouter(prefix="/api/workspaces", tags=["Workspaces"])


# ── Helpers ────────────────────────────────────────────────────────
async def get_workspace_membership(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> WorkspaceMember:
    query = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    )
    result = await db.execute(query)
    member = result.scalar_one_or_none()
    if not member:
        # Check if the workspace is public
        ws_query = select(Workspace).where(Workspace.id == workspace_id)
        ws_result = await db.execute(ws_query)
        workspace = ws_result.scalar_one_or_none()
        if workspace and workspace.privacy_level == "Public":
            # Return a temporary member object with Viewer role
            temp_member = WorkspaceMember(
                workspace_id=workspace_id,
                user_id=current_user.id,
                role="Viewer"
            )
            return temp_member
        raise HTTPException(status_code=403, detail="You are not a member of this workspace")
    return member


async def log_activity(db: AsyncSession, workspace_id: int, user_id: int, action: str, details: str | None = None):
    activity = WorkspaceActivity(
        workspace_id=workspace_id,
        user_id=user_id,
        action=action,
        details=details
    )
    db.add(activity)
    await db.flush()


# ── Workspace Endpoints ────────────────────────────────────────────
@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get all workspaces where user is owner or member
    stmt = (
        select(Workspace)
        .outerjoin(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(
            (Workspace.owner_id == current_user.id) |
            (WorkspaceMember.user_id == current_user.id)
        )
        .distinct()
    )
    res = await db.execute(stmt)
    workspaces = res.scalars().all()
    
    responses = []
    for ws in workspaces:
        # Get owner name
        owner_res = await db.execute(select(User).where(User.id == ws.owner_id))
        owner = owner_res.scalar_one_or_none()
        owner_name = owner.full_name if owner else "Unknown"
        
        # Get members
        mem_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id)
        mem_res = await db.execute(mem_stmt)
        members = mem_res.scalars().all()
        
        member_list = []
        for m in members:
            u_res = await db.execute(select(User).where(User.id == m.user_id))
            u = u_res.scalar_one_or_none()
            member_list.append(WorkspaceMemberResponse(
                id=m.id,
                workspace_id=m.workspace_id,
                user_id=m.user_id,
                role=m.role,
                joined_at=m.joined_at,
                user_email=u.email if u else None,
                user_full_name=u.full_name if u else None
            ))
            
        responses.append(WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            description=ws.description,
            icon=ws.icon,
            theme=ws.theme,
            category=ws.category,
            privacy_level=ws.privacy_level,
            created_at=ws.created_at,
            updated_at=ws.updated_at,
            owner_id=ws.owner_id,
            owner_name=owner_name,
            members=member_list
        ))
    return responses


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workspace = Workspace(
        name=data.name,
        description=data.description,
        icon=data.icon,
        theme=data.theme,
        category=data.category,
        privacy_level=data.privacy_level,
        owner_id=current_user.id
    )
    db.add(workspace)
    await db.flush()

    # Automatically add owner as Owner role member
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="Owner"
    )
    db.add(member)
    await db.flush()
    
    # Initialize workspace analytics record
    analytics = WorkspaceAnalytics(
        workspace_id=workspace.id,
        user_id=current_user.id
    )
    db.add(analytics)
    await db.flush()

    await log_activity(db, workspace.id, current_user.id, "created workspace", f"Workspace name: {workspace.name}")
    await db.commit()

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        description=workspace.description,
        icon=workspace.icon,
        theme=workspace.theme,
        category=workspace.category,
        privacy_level=workspace.privacy_level,
        created_at=workspace.created_at,
        updated_at=workspace.updated_at,
        owner_id=workspace.owner_id,
        owner_name=current_user.full_name,
        members=[WorkspaceMemberResponse(
            id=member.id,
            workspace_id=member.workspace_id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            user_email=current_user.email,
            user_full_name=current_user.full_name
        )]
    )


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    owner_res = await db.execute(select(User).where(User.id == ws.owner_id))
    owner = owner_res.scalar_one_or_none()
    owner_name = owner.full_name if owner else "Unknown"

    mem_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == ws.id)
    mem_res = await db.execute(mem_stmt)
    members = mem_res.scalars().all()
    
    member_list = []
    for m in members:
        u_res = await db.execute(select(User).where(User.id == m.user_id))
        u = u_res.scalar_one_or_none()
        member_list.append(WorkspaceMemberResponse(
            id=m.id,
            workspace_id=m.workspace_id,
            user_id=m.user_id,
            role=m.role,
            joined_at=m.joined_at,
            user_email=u.email if u else None,
            user_full_name=u.full_name if u else None
        ))

    return WorkspaceResponse(
        id=ws.id,
        name=ws.name,
        description=ws.description,
        icon=ws.icon,
        theme=ws.theme,
        category=ws.category,
        privacy_level=ws.privacy_level,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        owner_id=ws.owner_id,
        owner_name=owner_name,
        members=member_list
    )


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can update workspaces")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(ws, key, val)

    await log_activity(db, workspace_id, current_user.id, "updated workspace properties")
    await db.flush()
    await db.commit()
    
    # Reload
    return await get_workspace(workspace_id, db, membership)


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    if membership.role != "Owner":
        raise HTTPException(status_code=403, detail="Only Owners can delete workspaces")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    await db.delete(ws)
    await db.commit()
    return None


# ── Invite Link Endpoints ──────────────────────────────────────────
from datetime import timedelta

@router.post("/{workspace_id}/invites", response_model=WorkspaceInviteResponse, status_code=status.HTTP_201_CREATED)
async def generate_invite(
    workspace_id: int,
    data: WorkspaceInviteCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can generate invite links")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.privacy_level == "Private":
        raise HTTPException(status_code=400, detail="Cannot generate invite links for Private workspaces")

    token = uuid.uuid4().hex
    expires_at = None
    if data.expires_in_hours:
        expires_at = datetime.now() + timedelta(hours=data.expires_in_hours)

    invite = WorkspaceInvite(
        workspace_id=workspace_id,
        creator_id=current_user.id,
        invite_token=token,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(invite)
    await db.flush()
    await db.commit()

    return invite


@router.get("/{workspace_id}/invites", response_model=list[WorkspaceInviteResponse])
async def list_invites(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can view invite links")

    stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace_id,
        WorkspaceInvite.is_revoked == False
    )
    res = await db.execute(stmt)
    invites = res.scalars().all()
    
    active_invites = []
    now_dt = datetime.now()
    for inv in invites:
        if inv.expires_at and inv.expires_at < now_dt:
            continue
        active_invites.append(inv)
    return active_invites


@router.post("/{workspace_id}/invites/{invite_token}/revoke", response_model=WorkspaceInviteResponse)
async def revoke_invite(
    workspace_id: int,
    invite_token: str,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can revoke invite links")

    stmt = select(WorkspaceInvite).where(
        WorkspaceInvite.workspace_id == workspace_id,
        WorkspaceInvite.invite_token == invite_token
    )
    res = await db.execute(stmt)
    invite = res.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite link not found")

    invite.is_revoked = True
    await db.flush()
    await db.commit()
    return invite


@router.post("/join/token/{invite_token}", response_model=WorkspaceResponse)
async def join_workspace_via_token(
    invite_token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(WorkspaceInvite).where(WorkspaceInvite.invite_token == invite_token)
    res = await db.execute(stmt)
    invite = res.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite token")

    if invite.is_revoked:
        raise HTTPException(status_code=400, detail="This invite link has been revoked")

    if invite.expires_at and invite.expires_at < datetime.now():
        raise HTTPException(status_code=400, detail="This invite link has expired")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == invite.workspace_id))
    workspace = ws_res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.privacy_level == "Private":
        raise HTTPException(status_code=400, detail="Cannot join a Private workspace via invite link")

    # Check if already a member
    mem_stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace.id,
        WorkspaceMember.user_id == current_user.id
    )
    mem_res = await db.execute(mem_stmt)
    member = mem_res.scalar_one_or_none()
    if member:
        # Already a member, return current workspace
        return await get_workspace(workspace.id, db, member)

    new_member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="Member"
    )
    db.add(new_member)
    await db.flush()

    # Initialize analytics
    analytics = WorkspaceAnalytics(
        workspace_id=workspace.id,
        user_id=current_user.id
    )
    db.add(analytics)
    await db.flush()

    await log_activity(db, workspace.id, current_user.id, "joined workspace", "Joined via invite link")
    
    await create_workspace_notification(
        db=db,
        workspace_id=workspace.id,
        title="👤 Member Joined Workspace",
        message=f'{current_user.full_name} joined "{workspace.name}" via invite link',
        type="workspace_member_added",
        related_item_id=f"member:{new_member.id}",
        sender_id=current_user.id
    )
    
    await db.commit()

    return await get_workspace(workspace.id, db, new_member)


@router.post("/{workspace_id}/join", response_model=WorkspaceResponse)
async def join_public_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_res.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if workspace.privacy_level != "Public":
        raise HTTPException(status_code=400, detail="Direct join is only allowed for Public workspaces")

    # Check if already a member
    mem_stmt = select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id
    )
    mem_res = await db.execute(mem_stmt)
    member = mem_res.scalar_one_or_none()
    if member:
        return await get_workspace(workspace_id, db, member)

    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=current_user.id,
        role="Member"
    )
    db.add(new_member)
    await db.flush()

    # Initialize analytics
    analytics = WorkspaceAnalytics(
        workspace_id=workspace_id,
        user_id=current_user.id
    )
    db.add(analytics)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "joined workspace", "Joined public workspace")
    
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="👤 Member Joined Workspace",
        message=f'{current_user.full_name} joined "{workspace.name}"',
        type="workspace_member_added",
        related_item_id=f"member:{new_member.id}",
        sender_id=current_user.id
    )
    
    await db.commit()

    return await get_workspace(workspace_id, db, new_member)



# ── Membership Endpoints ───────────────────────────────────────────
@router.post("/{workspace_id}/members", response_model=WorkspaceMemberResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    workspace_id: int,
    invite: WorkspaceMemberInvite,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can add members")

    # Check if user exists
    user_res = await db.execute(select(User).where(User.email == invite.email))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    # Check if already a member
    exist_res = await db.execute(select(WorkspaceMember).where(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id
    ))
    exist = exist_res.scalar_one_or_none()
    if exist:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")

    new_member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user.id,
        role=invite.role
    )
    db.add(new_member)
    await db.flush()

    # Initialize analytics for new member
    analytics = WorkspaceAnalytics(
        workspace_id=workspace_id,
        user_id=user.id
    )
    db.add(analytics)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "added member", f"Added user: {user.full_name} ({user.email}) as {invite.role}")
    
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = ws_res.scalar_one_or_none()
    ws_name = workspace.name if workspace else "Workspace"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="👤 Added to Workspace",
        message=f'You have been added to "{ws_name}" by {current_user.full_name}',
        type="workspace_member_added",
        related_item_id=f"member:{new_member.id}",
        sender_id=current_user.id
    )
    
    await db.commit()

    return WorkspaceMemberResponse(
        id=new_member.id,
        workspace_id=new_member.workspace_id,
        user_id=new_member.user_id,
        role=new_member.role,
        joined_at=new_member.joined_at,
        user_email=user.email,
        user_full_name=user.full_name
    )


@router.put("/{workspace_id}/members/{member_id}", response_model=WorkspaceMemberResponse)
async def update_member_role(
    workspace_id: int,
    member_id: int,
    data: WorkspaceMemberUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners and Admins can modify roles")

    member_res = await db.execute(select(WorkspaceMember).where(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace_id
    ))
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Workspace member not found")

    # Security check: Owner role
    if member.role == "Owner" and data.role != "Owner":
        # Check if there are other owners
        owners_query = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.role == "Owner"
        )
        owners_res = await db.execute(owners_query)
        owners_count = len(owners_res.scalars().all())
        if owners_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot demote the only Owner of this workspace")

    member.role = data.role
    u_res = await db.execute(select(User).where(User.id == member.user_id))
    u = u_res.scalar_one_or_none()

    await log_activity(db, workspace_id, current_user.id, "updated role", f"Updated user {u.full_name if u else ''} role to {data.role}")
    await db.flush()
    await db.commit()

    return WorkspaceMemberResponse(
        id=member.id,
        workspace_id=member.workspace_id,
        user_id=member.user_id,
        role=member.role,
        joined_at=member.joined_at,
        user_email=u.email if u else None,
        user_full_name=u.full_name if u else None
    )


@router.delete("/{workspace_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: int,
    member_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    member_res = await db.execute(select(WorkspaceMember).where(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace_id
    ))
    member = member_res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Workspace member not found")

    # Owner cannot leave/be removed unless they delete workspace or transfer ownership
    if member.role == "Owner":
        raise HTTPException(status_code=400, detail="Owner cannot be removed. Transfer ownership or delete workspace.")

    # Permissions check: user can remove themselves (leave), or owners/admins can remove members
    if member.user_id != current_user.id and membership.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Permission denied")

    u_res = await db.execute(select(User).where(User.id == member.user_id))
    u = u_res.scalar_one_or_none()

    # Delete analytics records for that user too
    await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == member.user_id
    ))
    
    await db.delete(member)
    action_type = "left workspace" if member.user_id == current_user.id else "removed member"
    await log_activity(db, workspace_id, current_user.id, action_type, f"User: {u.full_name if u else ''}")
    await db.commit()
    return None


# ── Shared Notes (Module 1) ───────────────────────────────────────
@router.get("/{workspace_id}/notes", response_model=list[WorkspaceNoteResponse])
async def list_workspace_notes(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceNote).where(WorkspaceNote.workspace_id == workspace_id).order_by(WorkspaceNote.updated_at.desc())
    res = await db.execute(stmt)
    notes = res.scalars().all()
    
    responses = []
    for n in notes:
        u_res = await db.execute(select(User).where(User.id == n.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceNoteResponse(
            id=n.id,
            workspace_id=n.workspace_id,
            user_id=n.user_id,
            title=n.title,
            content=n.content,
            category=n.category,
            ai_summary=n.ai_summary,
            comments=n.comments or [],
            created_at=n.created_at,
            updated_at=n.updated_at,
            author_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/notes", response_model=WorkspaceNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_note(
    workspace_id: int,
    data: WorkspaceNoteCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot create notes")

    note = WorkspaceNote(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        category=data.category,
        ai_summary=None,
        comments=[]
    )
    db.add(note)
    await db.flush()

    # Track activity & update analytics
    await log_activity(db, workspace_id, current_user.id, "created note", f"Note: {note.title}")
    
    # Increment notes_created score
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.notes_created += 1
        analytics.contribution_score += 5.0
        analytics.workspace_activity += 1
        
    await db.commit()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments,
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=current_user.full_name
    )

@router.get("/{workspace_id}/notes/{note_id}", response_model=WorkspaceNoteResponse)
async def get_workspace_note(
    workspace_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments or [],
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.get("/{workspace_id}/notes/{note_id}/comments")
async def get_workspace_note_comments(
    workspace_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note.comments or []



@router.put("/{workspace_id}/notes/{note_id}", response_model=WorkspaceNoteResponse)
async def update_workspace_note(
    workspace_id: int,
    note_id: int,
    data: WorkspaceNoteUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit notes")

    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    update_dict = data.model_dump(exclude_unset=True)
    
    for key, val in update_dict.items():
        setattr(note, key, val)

    await log_activity(db, workspace_id, current_user.id, "edited note", f"Note: {note.title}")
    
    # Update activity analytics
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 1.0

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments,
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_note(
    workspace_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete notes")

    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    await log_activity(db, workspace_id, current_user.id, "deleted note", f"Title: {note.title}")
    await db.delete(note)
    await db.commit()
    return None


@router.post("/{workspace_id}/notes/{note_id}/summarize", response_model=WorkspaceNoteResponse)
async def summarize_workspace_note(
    workspace_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot summarize notes")

    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if not note.content:
        raise HTTPException(status_code=400, detail="Cannot summarize an empty note")

    try:
        summary = await ai_service.summarize_note(note.content, category=note.category or "General")
        note.ai_summary = summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI summary failed: {str(e)}")

    await log_activity(db, workspace_id, current_user.id, "summarized note", f"Note: {note.title}")
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments or [],
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/notes/{note_id}/summary", response_model=WorkspaceNoteResponse)
async def delete_workspace_note_summary(
    workspace_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete summaries")

    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.ai_summary = None
    await log_activity(db, workspace_id, current_user.id, "deleted note summary", f"Note: {note.title}")
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments or [],
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.post("/{workspace_id}/notes/{note_id}/comments", response_model=WorkspaceNoteResponse)
async def comment_on_workspace_note(
    workspace_id: int,
    note_id: int,
    comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    new_comments = list(note.comments or [])
    new_comments.append({
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "content": comment_data.content,
        "created_at": datetime.now().isoformat()
    })
    
    note.comments = new_comments
    await log_activity(db, workspace_id, current_user.id, "commented on note", f"Note: {note.title}")
    
    # Increment activity
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 2.0

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments,
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )



@router.delete("/{workspace_id}/notes/{note_id}/comments/{comment_id}", response_model=WorkspaceNoteResponse)
async def delete_workspace_note_comment(
    workspace_id: int,
    note_id: int,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    note_res = await db.execute(select(WorkspaceNote).where(
        WorkspaceNote.id == note_id,
        WorkspaceNote.workspace_id == workspace_id
    ))
    note = note_res.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    comments = list(note.comments or [])
    comment_to_delete = None
    for c in comments:
        if c.get("id") == comment_id:
            comment_to_delete = c
            break

    if not comment_to_delete:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Permissions check:
    # Users can delete their own feedback.
    # Workspace owners/admins can delete any feedback.
    is_owner_or_admin = membership.role in ["Owner", "Admin"]
    is_author = comment_to_delete.get("user_id") == current_user.id

    if not (is_author or is_owner_or_admin):
        raise HTTPException(
            status_code=403,
            detail="Permission denied. You can only delete your own comments unless you are a workspace owner/admin."
        )

    comments.remove(comment_to_delete)
    note.comments = comments
    await log_activity(db, workspace_id, current_user.id, "deleted comment on note", f"Note: {note.title}")
    
    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == note.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceNoteResponse(
        id=note.id,
        workspace_id=note.workspace_id,
        user_id=note.user_id,
        title=note.title,
        content=note.content,
        category=note.category,
        ai_summary=note.ai_summary,
        comments=note.comments,
        created_at=note.created_at,
        updated_at=note.updated_at,
        author_name=u.full_name if u else "Unknown"
    )



# ── Kanban Task Board (Module 2) ───────────────────────────────────
@router.get("/{workspace_id}/tasks", response_model=list[WorkspaceTaskResponse])
async def list_workspace_tasks(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceTask).where(WorkspaceTask.workspace_id == workspace_id).order_by(WorkspaceTask.due_date.asc().nullslast(), WorkspaceTask.created_at.desc())
    res = await db.execute(stmt)
    tasks = res.scalars().all()

    responses = []
    for t in tasks:
        assignee_name = None
        if t.assignee_id:
            as_res = await db.execute(select(User).where(User.id == t.assignee_id))
            assignee = as_res.scalar_one_or_none()
            assignee_name = assignee.full_name if assignee else None

        cr_res = await db.execute(select(User).where(User.id == t.creator_id))
        creator = cr_res.scalar_one_or_none()
        creator_name = creator.full_name if creator else "Unknown"

        responses.append(WorkspaceTaskResponse(
            id=t.id,
            workspace_id=t.workspace_id,
            assignee_id=t.assignee_id,
            creator_id=t.creator_id,
            title=t.title,
            description=t.description,
            priority=t.priority,
            status=t.status,
            due_date=t.due_date,
            progress=t.progress,
            tags=t.tags or [],
            subtasks=t.subtasks or [],
            comments=t.comments or [],
            created_at=t.created_at,
            updated_at=t.updated_at,
            assignee_name=assignee_name,
            creator_name=creator_name
        ))
    return responses


@router.post("/{workspace_id}/tasks", response_model=WorkspaceTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_task(
    workspace_id: int,
    data: WorkspaceTaskCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot create tasks")

    # Validate assignee is a workspace member
    if data.assignee_id:
        chk_query = select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == data.assignee_id
        )
        chk_res = await db.execute(chk_query)
        if not chk_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Assignee is not a member of this workspace")

    # Auto-calculate progress based on subtasks
    progress = 0
    if data.subtasks:
        total = len(data.subtasks)
        completed = sum(1 for s in data.subtasks if s.get("completed", False))
        progress = int((completed / total) * 100) if total > 0 else 0

    task = WorkspaceTask(
        workspace_id=workspace_id,
        assignee_id=data.assignee_id,
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=data.status,
        due_date=convert_to_utc_aware(data.due_date),
        progress=progress,
        tags=data.tags,
        subtasks=data.subtasks,
        comments=[]
    )
    db.add(task)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "created task", f"Task: {task.title}")
    
    # Increment analytics activity
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 3.0

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    # Get assignee name
    assignee_name = None
    if task.assignee_id:
        as_res = await db.execute(select(User).where(User.id == task.assignee_id))
        assignee = as_res.scalar_one_or_none()
        assignee_name = assignee.full_name if assignee else None

    msg = f'Task "{task.title}" has been assigned to {assignee_name} in "{ws_name}"' if task.assignee_id else f'New task "{task.title}" has been created in "{ws_name}"'
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📋 New Task Assigned" if task.assignee_id else "📋 New Task Created",
        message=msg,
        type="task",
        related_item_id=f"task:{task.id}",
        sender_id=current_user.id
    )

    await db.commit()

    return WorkspaceTaskResponse(
        id=task.id,
        workspace_id=task.workspace_id,
        assignee_id=task.assignee_id,
        creator_id=task.creator_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        progress=task.progress,
        tags=task.tags,
        subtasks=task.subtasks,
        comments=task.comments,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee_name,
        creator_name=current_user.full_name
    )


@router.put("/{workspace_id}/tasks/{task_id}", response_model=WorkspaceTaskResponse)
async def update_workspace_task(
    workspace_id: int,
    task_id: int,
    data: WorkspaceTaskUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit tasks")

    task_res = await db.execute(select(WorkspaceTask).where(
        WorkspaceTask.id == task_id,
        WorkspaceTask.workspace_id == workspace_id
    ))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = data.model_dump(exclude_unset=True)

    # Perform updates
    for key, val in update_dict.items():
        if isinstance(val, datetime):
            val = convert_to_utc_aware(val)
        setattr(task, key, val)

    # Re-calculate subtask progress if subtasks were updated
    if "subtasks" in update_dict and task.subtasks:
        total = len(task.subtasks)
        completed = sum(1 for s in task.subtasks if s.get("completed", False))
        task.progress = int((completed / total) * 100) if total > 0 else 0
        if task.progress == 100:
            task.status = "Completed"
    else:
        # Check if progress manually set to 100
        if "progress" in update_dict and task.progress == 100:
            task.status = "Completed"
        elif "status" in update_dict and task.status == "Completed":
            task.progress = 100

    # Activity tracking details
    action_details = f"Task: {task.title}"
    if "status" in update_dict:
        action_details += f" (Status -> {task.status})"
        
    await log_activity(db, workspace_id, current_user.id, "updated task", action_details)

    # Handle completed task analytics reward
    if "status" in update_dict and task.status == "Completed":
        # Increment tasks_completed for the assignee
        user_to_reward = task.assignee_id or current_user.id
        an_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == user_to_reward
        ))
        analytics = an_res.scalar_one_or_none()
        if analytics:
            analytics.tasks_completed += 1
            analytics.contribution_score += 15.0  # 15 points for completing a task!
            analytics.workspace_activity += 1
    else:
        # Standard edit increment
        an_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == current_user.id
        ))
        analytics = an_res.scalar_one_or_none()
        if analytics:
            analytics.workspace_activity += 1
            analytics.contribution_score += 1.0

    await db.flush()
    await db.commit()

    # Get assignee name
    assignee_name = None
    if task.assignee_id:
        as_res = await db.execute(select(User).where(User.id == task.assignee_id))
        assignee = as_res.scalar_one_or_none()
        assignee_name = assignee.full_name if assignee else None

    cr_res = await db.execute(select(User).where(User.id == task.creator_id))
    creator = cr_res.scalar_one_or_none()
    creator_name = creator.full_name if creator else "Unknown"

    return WorkspaceTaskResponse(
        id=task.id,
        workspace_id=task.workspace_id,
        assignee_id=task.assignee_id,
        creator_id=task.creator_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        progress=task.progress,
        tags=task.tags,
        subtasks=task.subtasks,
        comments=task.comments,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee_name,
        creator_name=creator_name
    )


@router.delete("/{workspace_id}/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_task(
    workspace_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete tasks")

    task_res = await db.execute(select(WorkspaceTask).where(
        WorkspaceTask.id == task_id,
        WorkspaceTask.workspace_id == workspace_id
    ))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if membership.role not in ["Owner", "Admin"] and task.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this task")

    await log_activity(db, workspace_id, current_user.id, "deleted task", f"Title: {task.title}")
    await db.delete(task)
    await db.commit()
    return None



@router.post("/{workspace_id}/tasks/{task_id}/comments", response_model=WorkspaceTaskResponse)
async def comment_on_workspace_task(
    workspace_id: int,
    task_id: int,
    comment_data: WorkspaceTaskCommentCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    task_res = await db.execute(select(WorkspaceTask).where(
        WorkspaceTask.id == task_id,
        WorkspaceTask.workspace_id == workspace_id
    ))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    new_comments = list(task.comments or [])
    new_comments.append({
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "content": comment_data.content,
        "created_at": datetime.now().isoformat()
    })
    
    task.comments = new_comments
    await log_activity(db, workspace_id, current_user.id, "commented on task", f"Task: {task.title}")

    # Track activity
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 2.0

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="💬 New Comment on Task",
        message=f'{current_user.full_name} commented on "{task.title}" in "{ws_name}"',
        type="task",
        related_item_id=f"task:{task.id}",
        sender_id=current_user.id
    )

    await db.flush()
    await db.commit()

    # Get assignee name
    assignee_name = None
    if task.assignee_id:
        as_res = await db.execute(select(User).where(User.id == task.assignee_id))
        assignee = as_res.scalar_one_or_none()
        assignee_name = assignee.full_name if assignee else None

    cr_res = await db.execute(select(User).where(User.id == task.creator_id))
    creator = cr_res.scalar_one_or_none()
    creator_name = creator.full_name if creator else "Unknown"

    return WorkspaceTaskResponse(
        id=task.id,
        workspace_id=task.workspace_id,
        assignee_id=task.assignee_id,
        creator_id=task.creator_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        progress=task.progress,
        tags=task.tags,
        subtasks=task.subtasks,
        comments=task.comments,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee_name,
        creator_name=creator_name
    )


# ── Shared Goals (Module 3) ───────────────────────────────────────
@router.get("/{workspace_id}/goals", response_model=list[WorkspaceGoalResponse])
async def list_workspace_goals(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceGoal).where(WorkspaceGoal.workspace_id == workspace_id).order_by(WorkspaceGoal.created_at.desc())
    res = await db.execute(stmt)
    goals = res.scalars().all()

    responses = []
    for g in goals:
        cr_res = await db.execute(select(User).where(User.id == g.creator_id))
        creator = cr_res.scalar_one_or_none()
        responses.append(WorkspaceGoalResponse(
            id=g.id,
            workspace_id=g.workspace_id,
            creator_id=g.creator_id,
            title=g.title,
            progress=g.progress,
            milestones=g.milestones or [],
            created_at=g.created_at,
            updated_at=g.updated_at,
            creator_name=creator.full_name if creator else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/goals", response_model=WorkspaceGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_goal(
    workspace_id: int,
    data: WorkspaceGoalCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot create goals")

    progress = 0
    if data.milestones:
        total = len(data.milestones)
        completed = sum(1 for m in data.milestones if m.get("completed", False))
        progress = int((completed / total) * 100) if total > 0 else 0

    goal = WorkspaceGoal(
        workspace_id=workspace_id,
        creator_id=current_user.id,
        title=data.title,
        progress=progress,
        milestones=data.milestones
    )
    db.add(goal)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "created goal", f"Goal: {goal.title}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 4.0

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="🎯 New Goal Assigned",
        message=f'A new goal "{goal.title}" has been set for "{ws_name}"',
        type="goal",
        related_item_id=f"goal:{goal.id}",
        sender_id=current_user.id
    )

    await db.commit()

    return WorkspaceGoalResponse(
        id=goal.id,
        workspace_id=goal.workspace_id,
        creator_id=goal.creator_id,
        title=goal.title,
        progress=goal.progress,
        milestones=goal.milestones,
        comments=goal.comments,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        creator_name=current_user.full_name
    )


@router.put("/{workspace_id}/goals/{goal_id}", response_model=WorkspaceGoalResponse)
async def update_workspace_goal(
    workspace_id: int,
    goal_id: int,
    data: WorkspaceGoalUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit goals")

    goal_res = await db.execute(select(WorkspaceGoal).where(
        WorkspaceGoal.id == goal_id,
        WorkspaceGoal.workspace_id == workspace_id
    ))
    goal = goal_res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if membership.role not in ["Owner", "Admin"] and goal.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this goal")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(goal, key, val)

    # Re-calculate progress
    if "milestones" in update_dict and goal.milestones:
        total = len(goal.milestones)
        completed = sum(1 for m in goal.milestones if m.get("completed", False))
        goal.progress = int((completed / total) * 100) if total > 0 else 0
    
    await log_activity(db, workspace_id, current_user.id, "updated goal", f"Goal: {goal.title} (Progress: {goal.progress}%)")

    # If goal achieved (100% progress), reward user!
    if goal.progress == 100:
        an_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == goal.creator_id
        ))
        analytics = an_res.scalar_one_or_none()
        if analytics:
            analytics.goals_achieved += 1
            analytics.contribution_score += 25.0  # 25 points for achieving a milestone goal!
            analytics.workspace_activity += 1
    else:
        an_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == current_user.id
        ))
        analytics = an_res.scalar_one_or_none()
        if analytics:
            analytics.workspace_activity += 1
            analytics.contribution_score += 1.0

    await db.flush()
    await db.commit()

    cr_res = await db.execute(select(User).where(User.id == goal.creator_id))
    creator = cr_res.scalar_one_or_none()

    return WorkspaceGoalResponse(
        id=goal.id,
        workspace_id=goal.workspace_id,
        creator_id=goal.creator_id,
        title=goal.title,
        progress=goal.progress,
        milestones=goal.milestones,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        creator_name=creator.full_name if creator else "Unknown"
    )


@router.delete("/{workspace_id}/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_goal(
    workspace_id: int,
    goal_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete goals")

    goal_res = await db.execute(select(WorkspaceGoal).where(
        WorkspaceGoal.id == goal_id,
        WorkspaceGoal.workspace_id == workspace_id
    ))
    goal = goal_res.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if membership.role not in ["Owner", "Admin"] and goal.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this goal")

    await log_activity(db, workspace_id, current_user.id, "deleted goal", f"Title: {goal.title}")
    await db.delete(goal)
    await db.commit()
    return None



# ── Calendar & Event Scheduler (Module 4) ─────────────────────────
@router.get("/{workspace_id}/events", response_model=list[WorkspaceEventResponse])
async def list_workspace_events(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    # Fetch dedicated events
    ev_stmt = select(WorkspaceEvent).where(WorkspaceEvent.workspace_id == workspace_id).order_by(WorkspaceEvent.date.asc())
    ev_res = await db.execute(ev_stmt)
    events = ev_res.scalars().all()

    responses = []
    for e in events:
        u_res = await db.execute(select(User).where(User.id == e.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceEventResponse(
            id=e.id,
            workspace_id=e.workspace_id,
            user_id=e.user_id,
            title=e.title,
            description=e.description,
            type=e.type,
            date=e.date,
            comments=e.comments,
            created_at=e.created_at,
            updated_at=e.updated_at,
            creator_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/events", response_model=WorkspaceEventResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_event(
    workspace_id: int,
    data: WorkspaceEventCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot add events")

    event = WorkspaceEvent(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
        description=data.description,
        type=data.type,
        date=convert_to_utc_aware(data.date)
    )
    db.add(event)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "added event", f"Event: [{event.type}] {event.title} at {event.date}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 2.0

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    date_str = event.date.strftime("%d %b %Y at %I:%M %p")
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📅 New Event Added",
        message=f'Event "{event.title}" ({event.type}) has been added for {date_str} in "{ws_name}"',
        type="event",
        related_item_id=f"event:{event.id}",
        sender_id=current_user.id
    )

    await db.commit()

    return WorkspaceEventResponse(
        id=event.id,
        workspace_id=event.workspace_id,
        user_id=event.user_id,
        title=event.title,
        description=event.description,
        type=event.type,
        date=event.date,
        comments=event.comments,
        created_at=event.created_at,
        updated_at=event.updated_at,
        creator_name=current_user.full_name
    )


@router.put("/{workspace_id}/events/{event_id}", response_model=WorkspaceEventResponse)
async def update_workspace_event(
    workspace_id: int,
    event_id: int,
    data: WorkspaceEventUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit events")

    event_res = await db.execute(select(WorkspaceEvent).where(
        WorkspaceEvent.id == event_id,
        WorkspaceEvent.workspace_id == workspace_id
    ))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if membership.role not in ["Owner", "Admin"] and event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this event")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if isinstance(val, datetime):
            val = convert_to_utc_aware(val)
        setattr(event, key, val)
    event.updated_at = convert_to_utc_aware(datetime.now(timezone.utc))

    await log_activity(db, workspace_id, current_user.id, "updated event", f"Event: {event.title}")
    
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    date_str = event.date.strftime("%d %b %Y at %I:%M %p")
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📅 Event Details Updated",
        message=f'Event "{event.title}" details have been updated in "{ws_name}" to {date_str}',
        type="event",
        related_item_id=f"event:{event.id}",
        sender_id=current_user.id
    )

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == event.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceEventResponse(
        id=event.id,
        workspace_id=event.workspace_id,
        user_id=event.user_id,
        title=event.title,
        description=event.description,
        type=event.type,
        date=event.date,
        comments=event.comments,
        created_at=event.created_at,
        updated_at=event.updated_at,
        creator_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_event(
    workspace_id: int,
    event_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete events")

    event_res = await db.execute(select(WorkspaceEvent).where(
        WorkspaceEvent.id == event_id,
        WorkspaceEvent.workspace_id == workspace_id
    ))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if membership.role not in ["Owner", "Admin"] and event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this event")

    await log_activity(db, workspace_id, current_user.id, "deleted event", f"Event: {event.title}")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📅 Event Cancelled/Removed",
        message=f'Event "{event.title}" in "{ws_name}" has been removed.',
        type="event",
        related_item_id=f"event:{event.id}",
        sender_id=current_user.id
    )

    await db.delete(event)
    await db.commit()
    return None



@router.post("/{workspace_id}/events/conflict-check")
async def check_calendar_conflicts(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    # Fetch events, tasks, meetings
    evs = (await db.execute(select(WorkspaceEvent).where(WorkspaceEvent.workspace_id == workspace_id))).scalars().all()
    tasks = (await db.execute(select(WorkspaceTask).where(WorkspaceTask.workspace_id == workspace_id))).scalars().all()
    meetings = (await db.execute(select(WorkspaceMeeting).where(WorkspaceMeeting.workspace_id == workspace_id))).scalars().all()

    # Construct schedules string
    schedule_lines = []
    for e in evs:
        schedule_lines.append(f"- Event: [{e.type}] {e.title} at {e.date.strftime('%Y-%m-%d %H:%M')}")
    for t in tasks:
        if t.due_date:
            schedule_lines.append(f"- Task Deadline: {t.title} due on {t.due_date.strftime('%Y-%m-%d')}")
    for m in meetings:
        schedule_lines.append(f"- Meeting: {m.title} scheduled at {m.date.strftime('%Y-%m-%d %H:%M')}")

    schedules_context = "\n".join(schedule_lines) if schedule_lines else "No events scheduled."
    
    prompt = (
        "Analyze the following list of workspace events, deadlines, and meetings. "
        "Detect any conflicts such as overlapping meetings, multiple deadlines on the same day, "
        "or extremely busy exam periods. Write a short, bulleted conflict report (maximum 5 items). "
        "If there are no conflicts, warmly say that the schedule is clear.\n\n"
        f"Schedule:\n{schedules_context}"
    )

    try:
        report = await ai_service.chat_with_ai(prompt, context="Conflict Check Engine", custom_system_prompt="You are a smart calendar conflict detector. Keep it very concise.")
        return {"report": report}
    except Exception as e:
        return {"report": "Unable to perform calendar conflict check at this time."}


# ── Discussion Hub (Module 5) ─────────────────────────────────────
@router.get("/{workspace_id}/discussions", response_model=list[WorkspaceDiscussionResponse])
async def list_workspace_discussions(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceDiscussion).where(WorkspaceDiscussion.workspace_id == workspace_id).order_by(WorkspaceDiscussion.created_at.desc())
    res = await db.execute(stmt)
    discussions = res.scalars().all()

    responses = []
    for d in discussions:
        u_res = await db.execute(select(User).where(User.id == d.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceDiscussionResponse(
            id=d.id,
            workspace_id=d.workspace_id,
            user_id=d.user_id,
            title=d.title,
            content=d.content,
            category=d.category,
            reactions=d.reactions or {},
            created_at=d.created_at,
            updated_at=d.updated_at,
            author_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/discussions", response_model=WorkspaceDiscussionResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_discussion(
    workspace_id: int,
    data: WorkspaceDiscussionCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot post in discussions")

    disc = WorkspaceDiscussion(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        category=data.category,
        reactions={}
    )
    db.add(disc)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "posted discussion", f"Topic: {disc.title}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 4.0

    await db.commit()

    return WorkspaceDiscussionResponse(
        id=disc.id,
        workspace_id=disc.workspace_id,
        user_id=disc.user_id,
        title=disc.title,
        content=disc.content,
        category=disc.category,
        reactions=disc.reactions,
        comments=disc.comments,
        created_at=disc.created_at,
        updated_at=disc.updated_at,
        author_name=current_user.full_name
    )


@router.post("/{workspace_id}/discussions/{discussion_id}/reactions", response_model=WorkspaceDiscussionResponse)
async def react_to_discussion(
    workspace_id: int,
    discussion_id: int,
    emoji: str = Query(...),
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    stmt = select(WorkspaceDiscussion).where(
        WorkspaceDiscussion.id == discussion_id,
        WorkspaceDiscussion.workspace_id == workspace_id
    )
    res = await db.execute(stmt)
    disc = res.scalar_one_or_none()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion topic not found")

    reactions_dict = dict(disc.reactions or {})
    user_list = list(reactions_dict.get(emoji, []))

    if current_user.id in user_list:
        user_list.remove(current_user.id)
    else:
        user_list.append(current_user.id)

    if user_list:
        reactions_dict[emoji] = user_list
    else:
        reactions_dict.pop(emoji, None)

    disc.reactions = reactions_dict
    
    # Increment contribution activity
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 0.5

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == disc.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceDiscussionResponse(
        id=disc.id,
        workspace_id=disc.workspace_id,
        user_id=disc.user_id,
        title=disc.title,
        content=disc.content,
        category=disc.category,
        reactions=disc.reactions,
        comments=disc.comments,
        created_at=disc.created_at,
        updated_at=disc.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.put("/{workspace_id}/discussions/{discussion_id}", response_model=WorkspaceDiscussionResponse)
async def update_workspace_discussion(
    workspace_id: int,
    discussion_id: int,
    data: WorkspaceDiscussionUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit discussions")

    disc_res = await db.execute(select(WorkspaceDiscussion).where(
        WorkspaceDiscussion.id == discussion_id,
        WorkspaceDiscussion.workspace_id == workspace_id
    ))
    disc = disc_res.scalar_one_or_none()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")

    if membership.role not in ["Owner", "Admin"] and disc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this discussion")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(disc, key, val)
    disc.updated_at = datetime.utcnow()

    await log_activity(db, workspace_id, current_user.id, "updated discussion", f"Title: {disc.title}")
    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == disc.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceDiscussionResponse(
        id=disc.id,
        workspace_id=disc.workspace_id,
        user_id=disc.user_id,
        title=disc.title,
        content=disc.content,
        category=disc.category,
        reactions=disc.reactions,
        comments=disc.comments,
        created_at=disc.created_at,
        updated_at=disc.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/discussions/{discussion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_discussion(
    workspace_id: int,
    discussion_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete discussions")

    disc_res = await db.execute(select(WorkspaceDiscussion).where(
        WorkspaceDiscussion.id == discussion_id,
        WorkspaceDiscussion.workspace_id == workspace_id
    ))
    disc = disc_res.scalar_one_or_none()
    if not disc:
        raise HTTPException(status_code=404, detail="Discussion not found")

    if membership.role not in ["Owner", "Admin"] and disc.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this discussion")

    await log_activity(db, workspace_id, current_user.id, "deleted discussion", f"Title: {disc.title}")
    await db.delete(disc)
    await db.commit()
    return None


# ── Knowledge Wall (Module 6) ─────────────────────────────────────
@router.get("/{workspace_id}/knowledge", response_model=list[WorkspaceKnowledgeResponse])
async def list_knowledge_wall(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceKnowledge).where(WorkspaceKnowledge.workspace_id == workspace_id).order_by(WorkspaceKnowledge.category.asc(), WorkspaceKnowledge.created_at.desc())
    res = await db.execute(stmt)
    items = res.scalars().all()

    responses = []
    for item in items:
        u_res = await db.execute(select(User).where(User.id == item.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceKnowledgeResponse(
            id=item.id,
            workspace_id=item.workspace_id,
            user_id=item.user_id,
            title=item.title,
            content=item.content,
            category=item.category,
            created_at=item.created_at,
            updated_at=item.updated_at,
            author_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/knowledge", response_model=WorkspaceKnowledgeResponse, status_code=status.HTTP_201_CREATED)
async def add_knowledge(
    workspace_id: int,
    data: WorkspaceKnowledgeCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot contribute to the Knowledge Wall")

    item = WorkspaceKnowledge(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        category=data.category
    )
    db.add(item)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "contributed knowledge", f"Knowledge Title: {item.title}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 10.0  # Knowledge gives 10 points!

    await db.commit()

    return WorkspaceKnowledgeResponse(
        id=item.id,
        workspace_id=item.workspace_id,
        user_id=item.user_id,
        title=item.title,
        content=item.content,
        category=item.category,
        comments=item.comments,
        created_at=item.created_at,
        updated_at=item.updated_at,
        author_name=current_user.full_name
    )


@router.post("/{workspace_id}/knowledge/organize")
async def organize_knowledge_wall(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    # Fetch all knowledge wall items
    items = (await db.execute(select(WorkspaceKnowledge).where(WorkspaceKnowledge.workspace_id == workspace_id))).scalars().all()
    if not items:
        return {"tree": "No knowledge contributions in this workspace yet."}

    # Format list
    contributions = []
    for item in items:
        contributions.append(f"- Category: {item.category} | Title: {item.title} | Learning Summary: {item.content[:100]}...")

    contributions_text = "\n".join(contributions)

    prompt = (
        "Group the following KnoVault Knowledge Wall contributions into a single, clean tree outline. "
        "Use nested bullets to represent categories and their sub-themes. Organize them logically "
        "by subject (e.g. Algorithms -> Greedy -> Greedy Interval Scheduling). Keep the labels short, concise, and clean.\n\n"
        f"Contributions:\n{contributions_text}"
    )

    try:
        tree = await ai_service.chat_with_ai(prompt, context="Knowledge Wall Engine", custom_system_prompt="You are a knowledge taxonomist. Organize concepts into beautiful hierarchical outlines.")
        return {"tree": tree}
    except Exception:
        return {"tree": "Unable to organize knowledge wall using AI at this time."}


@router.put("/{workspace_id}/knowledge/{knowledge_id}", response_model=WorkspaceKnowledgeResponse)
async def update_workspace_knowledge(
    workspace_id: int,
    knowledge_id: int,
    data: WorkspaceKnowledgeUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit knowledge items")

    know_res = await db.execute(select(WorkspaceKnowledge).where(
        WorkspaceKnowledge.id == knowledge_id,
        WorkspaceKnowledge.workspace_id == workspace_id
    ))
    know = know_res.scalar_one_or_none()
    if not know:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    if membership.role not in ["Owner", "Admin"] and know.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this knowledge item")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(know, key, val)
    know.updated_at = datetime.utcnow()

    await log_activity(db, workspace_id, current_user.id, "updated knowledge contribution", f"Title: {know.title}")
    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == know.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceKnowledgeResponse(
        id=know.id,
        workspace_id=know.workspace_id,
        user_id=know.user_id,
        title=know.title,
        content=know.content,
        category=know.category,
        comments=know.comments,
        created_at=know.created_at,
        updated_at=know.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/knowledge/{knowledge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_knowledge(
    workspace_id: int,
    knowledge_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete knowledge items")

    know_res = await db.execute(select(WorkspaceKnowledge).where(
        WorkspaceKnowledge.id == knowledge_id,
        WorkspaceKnowledge.workspace_id == workspace_id
    ))
    know = know_res.scalar_one_or_none()
    if not know:
        raise HTTPException(status_code=404, detail="Knowledge item not found")

    if membership.role not in ["Owner", "Admin"] and know.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this knowledge item")

    await log_activity(db, workspace_id, current_user.id, "deleted knowledge contribution", f"Title: {know.title}")
    await db.delete(know)
    await db.commit()
    return None


# ── Brainstorm Board (Module 7) ───────────────────────────────────
@router.get("/{workspace_id}/ideas", response_model=list[WorkspaceIdeaResponse])
async def list_brainstorm_ideas(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceIdea).where(WorkspaceIdea.workspace_id == workspace_id).order_by(WorkspaceIdea.created_at.desc())
    res = await db.execute(stmt)
    ideas = res.scalars().all()

    responses = []
    for idea in ideas:
        u_res = await db.execute(select(User).where(User.id == idea.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceIdeaResponse(
            id=idea.id,
            workspace_id=idea.workspace_id,
            user_id=idea.user_id,
            title=idea.title,
            content=idea.content,
            category=idea.category,
            votes=idea.votes or [],
            created_at=idea.created_at,
            updated_at=idea.updated_at,
            author_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/ideas", response_model=WorkspaceIdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_brainstorm_idea(
    workspace_id: int,
    data: WorkspaceIdeaCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot contribute ideas")

    idea = WorkspaceIdea(
        workspace_id=workspace_id,
        user_id=current_user.id,
        title=data.title,
        content=data.content,
        category=data.category,
        votes=[]
    )
    db.add(idea)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "brainstormed idea", f"Idea: {idea.title}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 5.0

    await db.commit()

    return WorkspaceIdeaResponse(
        id=idea.id,
        workspace_id=idea.workspace_id,
        user_id=idea.user_id,
        title=idea.title,
        content=idea.content,
        category=idea.category,
        votes=idea.votes,
        comments=idea.comments,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
        author_name=current_user.full_name
    )


@router.post("/{workspace_id}/ideas/{idea_id}/vote", response_model=WorkspaceIdeaResponse)
async def vote_for_idea(
    workspace_id: int,
    idea_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    stmt = select(WorkspaceIdea).where(
        WorkspaceIdea.id == idea_id,
        WorkspaceIdea.workspace_id == workspace_id
    )
    res = await db.execute(stmt)
    idea = res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea sticky note not found")

    v_list = list(idea.votes or [])
    if current_user.id in v_list:
        v_list.remove(current_user.id)
    else:
        v_list.append(current_user.id)

    idea.votes = v_list
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 1.0

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == idea.user_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceIdeaResponse(
        id=idea.id,
        workspace_id=idea.workspace_id,
        user_id=idea.user_id,
        title=idea.title,
        content=idea.content,
        category=idea.category,
        votes=idea.votes,
        comments=idea.comments,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.post("/{workspace_id}/ideas/cluster")
async def cluster_brainstorm_ideas(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    ideas = (await db.execute(select(WorkspaceIdea).where(WorkspaceIdea.workspace_id == workspace_id))).scalars().all()
    if not ideas:
        return {"report": "No sticky note ideas to cluster yet."}

    lines = []
    for idea in ideas:
        lines.append(f"- [{idea.category}] {idea.title}: {idea.content[:100]}")

    ideas_text = "\n".join(lines)

    prompt = (
        "Group the following sticky note ideas into thematic clusters. "
        "Create 2-4 primary theme headings (e.g. AI Features, UI/UX Enhancements) and list the "
        "associated idea titles under each heading with a brief explanation. Keep the response compact for mobile view.\n\n"
        f"Sticky Notes:\n{ideas_text}"
    )

    try:
        report = await ai_service.chat_with_ai(prompt, context="Sticky Note Clustering Engine", custom_system_prompt="You are a brainstorming coordinator. Group ideas into thematic packages.")
        return {"report": report}
    except Exception:
        return {"report": "Unable to cluster ideas at this time."}


@router.put("/{workspace_id}/ideas/{idea_id}", response_model=WorkspaceIdeaResponse)
async def update_workspace_idea(
    workspace_id: int,
    idea_id: int,
    data: WorkspaceIdeaUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit ideas")

    idea_res = await db.execute(select(WorkspaceIdea).where(
        WorkspaceIdea.id == idea_id,
        WorkspaceIdea.workspace_id == workspace_id
    ))
    idea = idea_res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    if membership.role not in ["Owner", "Admin"] and idea.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this idea")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        setattr(idea, key, val)
    idea.updated_at = datetime.utcnow()

    await log_activity(db, workspace_id, current_user.id, "updated brainstorm idea", f"Title: {idea.title}")
    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == idea.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceIdeaResponse(
        id=idea.id,
        workspace_id=idea.workspace_id,
        user_id=idea.user_id,
        title=idea.title,
        content=idea.content,
        category=idea.category,
        votes=idea.votes,
        comments=idea.comments,
        created_at=idea.created_at,
        updated_at=idea.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/ideas/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_idea(
    workspace_id: int,
    idea_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete ideas")

    idea_res = await db.execute(select(WorkspaceIdea).where(
        WorkspaceIdea.id == idea_id,
        WorkspaceIdea.workspace_id == workspace_id
    ))
    idea = idea_res.scalar_one_or_none()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    if membership.role not in ["Owner", "Admin"] and idea.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this idea")

    await log_activity(db, workspace_id, current_user.id, "deleted brainstorm idea", f"Title: {idea.title}")
    await db.delete(idea)
    await db.commit()
    return None


# ── Meeting Center (Module 8) ─────────────────────────────────────
@router.get("/{workspace_id}/meetings", response_model=list[WorkspaceMeetingResponse])
async def list_workspace_meetings(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceMeeting).where(WorkspaceMeeting.workspace_id == workspace_id).order_by(WorkspaceMeeting.date.desc())
    res = await db.execute(stmt)
    meetings = res.scalars().all()

    responses = []
    for m in meetings:
        u_res = await db.execute(select(User).where(User.id == m.organizer_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceMeetingResponse(
            id=m.id,
            workspace_id=m.workspace_id,
            organizer_id=m.organizer_id,
            title=m.title,
            date=m.date,
            agenda=m.agenda,
            decisions=m.decisions,
            action_items=m.action_items or [],
            summary=m.summary,
            created_at=m.created_at,
            updated_at=m.updated_at,
            organizer_name=u.full_name if u else "Unknown"
        ))
    return responses


@router.post("/{workspace_id}/meetings", response_model=WorkspaceMeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_meeting(
    workspace_id: int,
    data: WorkspaceMeetingCreate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot schedule meetings")

    meeting = WorkspaceMeeting(
        workspace_id=workspace_id,
        organizer_id=current_user.id,
        title=data.title,
        date=convert_to_utc_aware(data.date),
        agenda=data.agenda,
        decisions=None,
        action_items=[],
        summary=None
    )
    db.add(meeting)
    await db.flush()

    await log_activity(db, workspace_id, current_user.id, "scheduled meeting", f"Meeting: {meeting.title} at {meeting.date}")
    
    an_res = await db.execute(select(WorkspaceAnalytics).where(
        WorkspaceAnalytics.workspace_id == workspace_id,
        WorkspaceAnalytics.user_id == current_user.id
    ))
    analytics = an_res.scalar_one_or_none()
    if analytics:
        analytics.workspace_activity += 1
        analytics.contribution_score += 4.0

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    date_str = meeting.date.strftime("%d %b %Y at %I:%M %p")
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📹 New Meeting Scheduled",
        message=f'"{meeting.title}" has been scheduled for {date_str} in "{ws_name}"',
        type="meeting",
        related_item_id=f"meeting:{meeting.id}",
        sender_id=current_user.id
    )

    await db.commit()

    return WorkspaceMeetingResponse(
        id=meeting.id,
        workspace_id=meeting.workspace_id,
        organizer_id=meeting.organizer_id,
        title=meeting.title,
        date=meeting.date,
        agenda=meeting.agenda,
        decisions=meeting.decisions,
        action_items=meeting.action_items,
        summary=meeting.summary,
        comments=meeting.comments,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        organizer_name=current_user.full_name
    )


@router.post("/{workspace_id}/meetings/{meeting_id}/minutes", response_model=WorkspaceMeetingResponse)
async def generate_meeting_minutes(
    workspace_id: int,
    meeting_id: int,
    meeting_notes: str = Query(..., description="Raw text notes written during the meeting"),
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot generate meeting minutes")

    stmt = select(WorkspaceMeeting).where(
        WorkspaceMeeting.id == meeting_id,
        WorkspaceMeeting.workspace_id == workspace_id
    )
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting record not found")

    prompt = (
        "You are KnoVault Meeting AI. Analyze the following meeting notes and generate structured meeting minutes.\n"
        "Return a JSON object containing precisely four keys:\n"
        "1. 'summary': string (1-2 sentences of what the meeting covered)\n"
        "2. 'decisions': string (bulleted list of decisions made)\n"
        "3. 'action_items': list of objects (each object having 'task', 'assignee', and 'due_date' keys)\n"
        "4. 'deadlines': string (summary of upcoming calendar milestones)\n\n"
        f"Raw Meeting Notes:\n{meeting_notes}"
    )

    try:
        content = await ai_service.chat_with_ai(prompt, context="Meeting Minutes Engine", custom_system_prompt="You are a strict JSON generator. Return only raw JSON without code blocks.")
        
        # Strip code block markings if LLM added them
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        data = json.loads(content)

        meeting.summary = data.get("summary", "AI Summary generated.")
        meeting.decisions = data.get("decisions", "No decisions logged.")
        meeting.action_items = data.get("action_items", [])

        # Auto-create tasks in workspace from action items!
        for item in meeting.action_items:
            task_title = item.get("task", "Meeting Follow-up Task")
            assignee_name = item.get("assignee", "").strip()
            
            due_date = None
            if item.get("due_date"):
                try:
                    due_date = datetime.fromisoformat(item["due_date"])
                except Exception:
                    due_date = None

            # Look up assignee by name if possible
            assignee_id = None
            if assignee_name:
                mem_stmt = select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id)
                mems = (await db.execute(mem_stmt)).scalars().all()
                for m in mems:
                    usr_res = await db.execute(select(User).where(User.id == m.user_id))
                    usr = usr_res.scalar_one_or_none()
                    if usr and (assignee_name.lower() in usr.full_name.lower() or usr.full_name.lower() in assignee_name.lower()):
                        assignee_id = usr.id
                        break

            new_task = WorkspaceTask(
                workspace_id=workspace_id,
                assignee_id=assignee_id,
                creator_id=current_user.id,
                title=task_title,
                description=f"Action item generated from meeting: {meeting.title}",
                due_date=due_date,
                status="To Do"
            )
            db.add(new_task)

        await log_activity(db, workspace_id, current_user.id, "generated meeting minutes", f"Meeting: {meeting.title}")
        
        an_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == current_user.id
        ))
        analytics = an_res.scalar_one_or_none()
        if analytics:
            analytics.workspace_activity += 1
            analytics.contribution_score += 10.0

        await db.flush()
        await db.commit()

    except Exception as e:
        print("[AI Meeting Center Error]:", e)
        raise HTTPException(status_code=500, detail="AI was unable to parse meeting notes into structured minutes.")

    u_res = await db.execute(select(User).where(User.id == meeting.organizer_id))
    u = u_res.scalar_one_or_none()

    return WorkspaceMeetingResponse(
        id=meeting.id,
        workspace_id=meeting.workspace_id,
        organizer_id=meeting.organizer_id,
        title=meeting.title,
        date=meeting.date,
        agenda=meeting.agenda,
        decisions=meeting.decisions,
        action_items=meeting.action_items,
        summary=meeting.summary,
        comments=meeting.comments,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        organizer_name=u.full_name if u else "Unknown"
    )


@router.put("/{workspace_id}/meetings/{meeting_id}", response_model=WorkspaceMeetingResponse)
async def update_workspace_meeting(
    workspace_id: int,
    meeting_id: int,
    data: WorkspaceMeetingUpdate,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot edit meetings")

    stmt = select(WorkspaceMeeting).where(
        WorkspaceMeeting.id == meeting_id,
        WorkspaceMeeting.workspace_id == workspace_id
    )
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting record not found")

    if membership.role not in ["Owner", "Admin"] and meeting.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this meeting")

    update_dict = data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if isinstance(val, datetime):
            val = convert_to_utc_aware(val)
        setattr(meeting, key, val)
    meeting.updated_at = convert_to_utc_aware(datetime.now(timezone.utc))

    await log_activity(db, workspace_id, current_user.id, "updated meeting schedule", f"Meeting: {meeting.title}")
    
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    date_str = meeting.date.strftime("%d %b %Y at %I:%M %p")
    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📹 Meeting Details Updated",
        message=f'Meeting "{meeting.title}" details have been updated in "{ws_name}" to {date_str}',
        type="meeting",
        related_item_id=f"meeting:{meeting.id}",
        sender_id=current_user.id
    )

    await db.flush()
    await db.commit()

    u_res = await db.execute(select(User).where(User.id == meeting.organizer_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceMeetingResponse(
        id=meeting.id,
        workspace_id=meeting.workspace_id,
        organizer_id=meeting.organizer_id,
        title=meeting.title,
        date=meeting.date,
        agenda=meeting.agenda,
        decisions=meeting.decisions,
        action_items=meeting.action_items,
        summary=meeting.summary,
        comments=meeting.comments,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        organizer_name=u.full_name if u else "Unknown"
    )


@router.delete("/{workspace_id}/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_meeting(
    workspace_id: int,
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    if membership.role == "Viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot delete meetings")

    stmt = select(WorkspaceMeeting).where(
        WorkspaceMeeting.id == meeting_id,
        WorkspaceMeeting.workspace_id == workspace_id
    )
    res = await db.execute(stmt)
    meeting = res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting record not found")

    if membership.role not in ["Owner", "Admin"] and meeting.organizer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this meeting")

    await log_activity(db, workspace_id, current_user.id, "deleted meeting", f"Meeting: {meeting.title}")

    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title="📹 Meeting Cancelled",
        message=f'Meeting "{meeting.title}" in "{ws_name}" has been cancelled.',
        type="meeting",
        related_item_id=f"meeting:{meeting.id}",
        sender_id=current_user.id
    )

    await db.delete(meeting)
    await db.commit()
    return None


# ── Team Memory & Workspace Assistant (Modules 9 & 10) ─────────────
@router.post("/{workspace_id}/ai/assistant", response_model=WorkspaceAIAssistantResponse)
async def ask_workspace_assistant(
    workspace_id: int,
    req: WorkspaceAIAssistantRequest,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    # Gather ALL Workspace Context
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()

    # 1. Tasks
    tasks = (await db.execute(select(WorkspaceTask).where(WorkspaceTask.workspace_id == workspace_id))).scalars().all()
    tasks_lines = []
    for t in tasks:
        assignee_name = "None"
        if t.assignee_id:
            as_res = await db.execute(select(User).where(User.id == t.assignee_id))
            assignee = as_res.scalar_one_or_none()
            assignee_name = assignee.full_name if assignee else "None"
        due_str = t.due_date.strftime("%Y-%m-%d") if t.due_date else "No due date"
        tasks_lines.append(f"- Task: {t.title} | Status: {t.status} | Assignee: {assignee_name} | Priority: {t.priority} | Due: {due_str}")

    # 2. Goals
    goals = (await db.execute(select(WorkspaceGoal).where(WorkspaceGoal.workspace_id == workspace_id))).scalars().all()
    goals_lines = []
    for g in goals:
        goals_lines.append(f"- Goal: {g.title} | Progress: {g.progress}%")

    # 3. Notes
    notes = (await db.execute(select(WorkspaceNote).where(WorkspaceNote.workspace_id == workspace_id))).scalars().all()
    notes_lines = []
    for n in notes:
        notes_lines.append(f"- Note: {n.title} | Summary: {n.ai_summary or 'No AI summary yet.'}")

    # 4. Meetings
    meetings = (await db.execute(select(WorkspaceMeeting).where(WorkspaceMeeting.workspace_id == workspace_id))).scalars().all()
    meetings_lines = []
    for m in meetings:
        decisions_str = m.decisions or "No decisions logged."
        meetings_lines.append(f"- Meeting: {m.title} | Date: {m.date.strftime('%Y-%m-%d')} | Decisions: {decisions_str}")

    # 5. Team Memory (Activities Log)
    activities = (await db.execute(select(WorkspaceActivity).where(WorkspaceActivity.workspace_id == workspace_id).order_by(WorkspaceActivity.timestamp.desc()).limit(30))).scalars().all()
    activity_lines = []
    for a in activities:
        u_res = await db.execute(select(User).where(User.id == a.user_id))
        u = u_res.scalar_one_or_none()
        u_name = u.full_name if u else "Someone"
        activity_lines.append(f"- {a.timestamp.strftime('%b %d, %H:%M')} | {u_name} {a.action}: {a.details or ''}")

    # Combine Context
    context = (
        f"Workspace Name: {ws.name if ws else 'Workspace'}\n"
        f"Category: {ws.category if ws else 'General'}\n"
        f"Description: {ws.description if ws else ''}\n\n"
        f"TASKS:\n" + "\n".join(tasks_lines) + "\n\n"
        f"GOALS:\n" + "\n".join(goals_lines) + "\n\n"
        f"NOTES:\n" + "\n".join(notes_lines) + "\n\n"
        f"MEETINGS:\n" + "\n".join(meetings_lines) + "\n\n"
        f"TEAM MEMORY (ACTIVITY LOG):\n" + "\n".join(activity_lines)
    )

    system_prompt = (
        "You are KnoVault Workspace AI Assistant.\n"
        "You have access to the full real-time database state and Team Memory (Activity Log) of this collaborative workspace.\n"
        "Use this data to answer member questions accurately, direct them to tasks, show pending items, track goals, and locate knowledge.\n"
        "Keep your answers short and compact (max 4 sentences or a simple bulleted list) as they are viewed on a mobile device.\n"
        "Always be friendly, helpful, and reference specific names and dates from the context."
    )

    try:
        response = await ai_service.chat_with_ai(req.message, context=context, custom_system_prompt=system_prompt)
        return WorkspaceAIAssistantResponse(response=response)
    except Exception as e:
        return WorkspaceAIAssistantResponse(response="I'm sorry, I'm currently unable to access the workspace memory.")


# ── Productivity Analytics & Leaderboards (Module 11) ──────────────
@router.get("/{workspace_id}/analytics", response_model=WorkspaceLeaderboardResponse)
async def get_workspace_analytics(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    # Fetch all members
    mems = (await db.execute(select(WorkspaceMember).where(WorkspaceMember.workspace_id == workspace_id))).scalars().all()
    
    analytics_records = []
    
    # Calculate total activities in workspace
    total_act_res = await db.execute(
        select(func.count()).select_from(WorkspaceActivity).where(WorkspaceActivity.workspace_id == workspace_id)
    )
    total_activities = total_act_res.scalar() or 0

    for m in mems:
        u_res = await db.execute(select(User).where(User.id == m.user_id))
        u = u_res.scalar_one_or_none()
        if not u:
            continue

        # Tasks Completed count
        tasks_res = await db.execute(
            select(func.count()).select_from(WorkspaceTask).where(
                WorkspaceTask.workspace_id == workspace_id,
                WorkspaceTask.assignee_id == m.user_id,
                WorkspaceTask.status == "Completed"
            )
        )
        tasks_completed = tasks_res.scalar() or 0

        # Goals achieved
        goals_res = await db.execute(
            select(func.count()).select_from(WorkspaceGoal).where(
                WorkspaceGoal.workspace_id == workspace_id,
                WorkspaceGoal.creator_id == m.user_id,
                WorkspaceGoal.progress == 100
            )
        )
        goals_achieved = goals_res.scalar() or 0

        # Notes created
        notes_res = await db.execute(
            select(func.count()).select_from(WorkspaceNote).where(
                WorkspaceNote.workspace_id == workspace_id,
                WorkspaceNote.user_id == m.user_id
            )
        )
        notes_created = notes_res.scalar() or 0

        # Discussions
        disc_res = await db.execute(
            select(func.count()).select_from(WorkspaceDiscussion).where(
                WorkspaceDiscussion.workspace_id == workspace_id,
                WorkspaceDiscussion.user_id == m.user_id
            )
        )
        discussions_created = disc_res.scalar() or 0

        # Knowledge contributions
        k_res = await db.execute(
            select(func.count()).select_from(WorkspaceKnowledge).where(
                WorkspaceKnowledge.workspace_id == workspace_id,
                WorkspaceKnowledge.user_id == m.user_id
            )
        )
        knowledge_created = k_res.scalar() or 0

        # Brainstorm stickies
        ideas_res = await db.execute(
            select(func.count()).select_from(WorkspaceIdea).where(
                WorkspaceIdea.workspace_id == workspace_id,
                WorkspaceIdea.user_id == m.user_id
            )
        )
        ideas_created = ideas_res.scalar() or 0

        # Member activity count
        act_res = await db.execute(
            select(func.count()).select_from(WorkspaceActivity).where(
                WorkspaceActivity.workspace_id == workspace_id,
                WorkspaceActivity.user_id == m.user_id
            )
        )
        activity_count = act_res.scalar() or 0

        # Contribution score formula
        contribution_score = float(
            (tasks_completed * 15) +
            (goals_achieved * 25) +
            (notes_created * 5) +
            (discussions_created * 5) +
            (knowledge_created * 10) +
            (ideas_created * 5) +
            (activity_count * 2)
        )

        participation_rate = float(
            (activity_count / total_activities * 100) if total_activities > 0 else 0.0
        )

        # Update or create WorkspaceAnalytics record in db
        an_rec_res = await db.execute(select(WorkspaceAnalytics).where(
            WorkspaceAnalytics.workspace_id == workspace_id,
            WorkspaceAnalytics.user_id == m.user_id
        ))
        an_rec = an_rec_res.scalar_one_or_none()
        if not an_rec:
            an_rec = WorkspaceAnalytics(
                workspace_id=workspace_id,
                user_id=m.user_id
            )
            db.add(an_rec)
        
        an_rec.tasks_completed = tasks_completed
        an_rec.goals_achieved = goals_achieved
        an_rec.notes_created = notes_created
        an_rec.workspace_activity = activity_count
        an_rec.contribution_score = contribution_score
        an_rec.participation_rate = participation_rate

        analytics_records.append(WorkspaceAnalyticsResponse(
            user_id=m.user_id,
            user_name=u.full_name,
            tasks_completed=tasks_completed,
            goals_achieved=goals_achieved,
            contribution_score=contribution_score,
            notes_created=notes_created,
            participation_rate=participation_rate,
            workspace_activity=activity_count
        ))

    await db.flush()
    await db.commit()

    # Sort leaderboard list
    analytics_records.sort(key=lambda x: x.contribution_score, reverse=True)

    # 🏆 Champions Selection
    top_contributor = analytics_records[0] if analytics_records else None
    
    most_productive = None
    if analytics_records:
        most_productive = max(analytics_records, key=lambda x: x.tasks_completed)
        if most_productive.tasks_completed == 0:
            most_productive = None

    knowledge_champion = None
    if analytics_records:
        knowledge_champion = max(analytics_records, key=lambda x: (x.notes_created + x.tasks_completed)) # Proxy metric
        if (knowledge_champion.notes_created) == 0:
            knowledge_champion = None

    return WorkspaceLeaderboardResponse(
        members=analytics_records,
        top_contributor=top_contributor,
        most_productive=most_productive,
        knowledge_champion=knowledge_champion
    )


# ── Team Memory Activity History (Module 9) ───────────────────────
@router.get("/{workspace_id}/activity", response_model=list[WorkspaceActivityResponse])
async def list_workspace_activity_log(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership)
):
    stmt = select(WorkspaceActivity).where(WorkspaceActivity.workspace_id == workspace_id).order_by(WorkspaceActivity.timestamp.desc()).limit(100)
    res = await db.execute(stmt)
    acts = res.scalars().all()

    responses = []
    for a in acts:
        u_res = await db.execute(select(User).where(User.id == a.user_id))
        u = u_res.scalar_one_or_none()
        responses.append(WorkspaceActivityResponse(
            id=a.id,
            workspace_id=a.workspace_id,
            user_id=a.user_id,
            action=a.action,
            details=a.details,
            timestamp=a.timestamp,
            user_name=u.full_name if u else "Someone"
        ))
    return responses


# ── COMMENT & FEEDBACK ENDPOINTS FOR ALL MODULES (UI & Multi-Entity support) ──

@router.delete("/{workspace_id}/tasks/{task_id}/comments/{comment_id}", response_model=WorkspaceTaskResponse)
async def delete_workspace_task_comment(
    workspace_id: int,
    task_id: int,
    comment_id: str,
    db: AsyncSession = Depends(get_db),
    membership: WorkspaceMember = Depends(get_workspace_membership),
    current_user: User = Depends(get_current_user)
):
    task_res = await db.execute(select(WorkspaceTask).where(
        WorkspaceTask.id == task_id,
        WorkspaceTask.workspace_id == workspace_id
    ))
    task = task_res.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = list(task.comments or [])
    comment_to_delete = None
    for c in comments:
        if c.get("id") == comment_id:
            comment_to_delete = c
            break

    if not comment_to_delete:
        raise HTTPException(status_code=404, detail="Comment not found")

    is_owner_or_admin = membership.role in ["Owner", "Admin"]
    is_author = comment_to_delete.get("user_id") == current_user.id
    if not (is_author or is_owner_or_admin):
        raise HTTPException(status_code=403, detail="Permission denied")

    comments.remove(comment_to_delete)
    task.comments = comments
    await log_activity(db, workspace_id, current_user.id, "deleted comment on task", f"Task: {task.title}")
    await db.commit()

    # Get assignee name
    assignee_name = None
    if task.assignee_id:
        as_res = await db.execute(select(User).where(User.id == task.assignee_id))
        assignee = as_res.scalar_one_or_none()
        assignee_name = assignee.full_name if assignee else None

    cr_res = await db.execute(select(User).where(User.id == task.creator_id))
    creator = cr_res.scalar_one_or_none()
    creator_name = creator.full_name if creator else "Unknown"

    return WorkspaceTaskResponse(
        id=task.id,
        workspace_id=task.workspace_id,
        assignee_id=task.assignee_id,
        creator_id=task.creator_id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=task.status,
        due_date=task.due_date,
        progress=task.progress,
        tags=task.tags,
        subtasks=task.subtasks,
        comments=task.comments,
        created_at=task.created_at,
        updated_at=task.updated_at,
        assignee_name=assignee_name,
        creator_name=creator_name
    )


# Generic Helper for adding/deleting comments on other models
async def handle_comment_add(db, workspace_id, entity_id, comment_data, current_user, model_class, entity_name_attr, action_prefix):
    entity_res = await db.execute(select(model_class).where(
        model_class.id == entity_id,
        model_class.workspace_id == workspace_id
    ))
    entity = entity_res.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Item not found")

    new_comments = list(entity.comments or [])
    new_comments.append({
        "id": str(uuid.uuid4()),
        "user_id": current_user.id,
        "full_name": current_user.full_name,
        "content": comment_data.content,
        "created_at": datetime.now().isoformat()
    })
    entity.comments = new_comments
    await log_activity(db, workspace_id, current_user.id, f"commented on {action_prefix}", f"Title: {getattr(entity, entity_name_attr)}")
    
    ws_res = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_res.scalar_one_or_none()
    ws_name = ws.name if ws else "Workspace"

    entity_title = getattr(entity, entity_name_attr, "Item")
    
    # Map notification type
    notif_type = "system"
    if action_prefix == "note":
        notif_type = "note_comment"
    elif action_prefix == "discussion":
        notif_type = "discussion_comment"
    elif action_prefix == "meeting":
        notif_type = "meeting"
    elif action_prefix == "event":
        notif_type = "event"
    elif action_prefix == "task":
        notif_type = "task"
    elif action_prefix == "goal":
        notif_type = "goal"

    title_str = "💬 New Discussion Reply" if action_prefix == "discussion" else f"💬 New Comment on {action_prefix.title()}"

    await create_workspace_notification(
        db=db,
        workspace_id=workspace_id,
        title=title_str,
        message=f'{current_user.full_name} commented on "{entity_title}" in "{ws_name}"',
        type=notif_type,
        related_item_id=f"{action_prefix}:{entity.id}",
        sender_id=current_user.id
    )

    await db.commit()
    return entity


async def handle_comment_delete(db, workspace_id, entity_id, comment_id, current_user, membership, model_class, entity_name_attr, action_prefix):
    entity_res = await db.execute(select(model_class).where(
        model_class.id == entity_id,
        model_class.workspace_id == workspace_id
    ))
    entity = entity_res.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail=f"Item not found")

    comments = list(entity.comments or [])
    comment_to_delete = None
    for c in comments:
        if c.get("id") == comment_id:
            comment_to_delete = c
            break

    if not comment_to_delete:
        raise HTTPException(status_code=404, detail="Comment not found")

    is_owner_or_admin = membership.role in ["Owner", "Admin"]
    is_author = comment_to_delete.get("user_id") == current_user.id
    if not (is_author or is_owner_or_admin):
        raise HTTPException(status_code=403, detail="Permission denied")

    comments.remove(comment_to_delete)
    entity.comments = comments
    await log_activity(db, workspace_id, current_user.id, f"deleted comment on {action_prefix}", f"Title: {getattr(entity, entity_name_attr)}")
    await db.commit()
    return entity


# GOALS COMMENTS
@router.post("/{workspace_id}/goals/{goal_id}/comments", response_model=WorkspaceGoalResponse)
async def comment_on_workspace_goal(
    workspace_id: int, goal_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    goal = await handle_comment_add(db, workspace_id, goal_id, comment_data, current_user, WorkspaceGoal, "title", "goal")
    cr_res = await db.execute(select(User).where(User.id == goal.creator_id))
    creator = cr_res.scalar_one_or_none()
    return WorkspaceGoalResponse(
        id=goal.id, workspace_id=goal.workspace_id, creator_id=goal.creator_id, title=goal.title,
        progress=goal.progress, milestones=goal.milestones, comments=goal.comments, created_at=goal.created_at, updated_at=goal.updated_at,
        creator_name=creator.full_name if creator else "Unknown"
    )

@router.delete("/{workspace_id}/goals/{goal_id}/comments/{comment_id}", response_model=WorkspaceGoalResponse)
async def delete_workspace_goal_comment(
    workspace_id: int, goal_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    goal = await handle_comment_delete(db, workspace_id, goal_id, comment_id, current_user, membership, WorkspaceGoal, "title", "goal")
    cr_res = await db.execute(select(User).where(User.id == goal.creator_id))
    creator = cr_res.scalar_one_or_none()
    return WorkspaceGoalResponse(
        id=goal.id, workspace_id=goal.workspace_id, creator_id=goal.creator_id, title=goal.title,
        progress=goal.progress, milestones=goal.milestones, comments=goal.comments, created_at=goal.created_at, updated_at=goal.updated_at,
        creator_name=creator.full_name if creator else "Unknown"
    )


# EVENTS COMMENTS
@router.post("/{workspace_id}/events/{event_id}/comments", response_model=WorkspaceEventResponse)
async def comment_on_workspace_event(
    workspace_id: int, event_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    event = await handle_comment_add(db, workspace_id, event_id, comment_data, current_user, WorkspaceEvent, "title", "event")
    u_res = await db.execute(select(User).where(User.id == event.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceEventResponse(
        id=event.id, workspace_id=event.workspace_id, user_id=event.user_id, title=event.title,
        description=event.description, type=event.type, date=event.date, comments=event.comments, created_at=event.created_at, updated_at=event.updated_at,
        creator_name=u.full_name if u else "Unknown"
    )

@router.delete("/{workspace_id}/events/{event_id}/comments/{comment_id}", response_model=WorkspaceEventResponse)
async def delete_workspace_event_comment(
    workspace_id: int, event_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    event = await handle_comment_delete(db, workspace_id, event_id, comment_id, current_user, membership, WorkspaceEvent, "title", "event")
    u_res = await db.execute(select(User).where(User.id == event.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceEventResponse(
        id=event.id, workspace_id=event.workspace_id, user_id=event.user_id, title=event.title,
        description=event.description, type=event.type, date=event.date, comments=event.comments, created_at=event.created_at, updated_at=event.updated_at,
        creator_name=u.full_name if u else "Unknown"
    )


# DISCUSSIONS COMMENTS
@router.post("/{workspace_id}/discussions/{discussion_id}/comments", response_model=WorkspaceDiscussionResponse)
async def comment_on_workspace_discussion(
    workspace_id: int, discussion_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    disc = await handle_comment_add(db, workspace_id, discussion_id, comment_data, current_user, WorkspaceDiscussion, "title", "discussion")
    u_res = await db.execute(select(User).where(User.id == disc.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceDiscussionResponse(
        id=disc.id, workspace_id=disc.workspace_id, user_id=disc.user_id, title=disc.title, content=disc.content,
        category=disc.category, reactions=disc.reactions, comments=disc.comments, created_at=disc.created_at, updated_at=disc.updated_at,
        author_name=u.full_name if u else "Unknown"
    )

@router.delete("/{workspace_id}/discussions/{discussion_id}/comments/{comment_id}", response_model=WorkspaceDiscussionResponse)
async def delete_workspace_discussion_comment(
    workspace_id: int, discussion_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    disc = await handle_comment_delete(db, workspace_id, discussion_id, comment_id, current_user, membership, WorkspaceDiscussion, "title", "discussion")
    u_res = await db.execute(select(User).where(User.id == disc.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceDiscussionResponse(
        id=disc.id, workspace_id=disc.workspace_id, user_id=disc.user_id, title=disc.title, content=disc.content,
        category=disc.category, reactions=disc.reactions, comments=disc.comments, created_at=disc.created_at, updated_at=disc.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


# KNOWLEDGE COMMENTS
@router.post("/{workspace_id}/knowledge/{knowledge_id}/comments", response_model=WorkspaceKnowledgeResponse)
async def comment_on_workspace_knowledge(
    workspace_id: int, knowledge_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    know = await handle_comment_add(db, workspace_id, knowledge_id, comment_data, current_user, WorkspaceKnowledge, "title", "knowledge wall item")
    u_res = await db.execute(select(User).where(User.id == know.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceKnowledgeResponse(
        id=know.id, workspace_id=know.workspace_id, user_id=know.user_id, title=know.title, content=know.content,
        category=know.category, comments=know.comments, created_at=know.created_at, updated_at=know.updated_at,
        author_name=u.full_name if u else "Unknown"
    )

@router.delete("/{workspace_id}/knowledge/{knowledge_id}/comments/{comment_id}", response_model=WorkspaceKnowledgeResponse)
async def delete_workspace_knowledge_comment(
    workspace_id: int, knowledge_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    know = await handle_comment_delete(db, workspace_id, knowledge_id, comment_id, current_user, membership, WorkspaceKnowledge, "title", "knowledge wall item")
    u_res = await db.execute(select(User).where(User.id == know.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceKnowledgeResponse(
        id=know.id, workspace_id=know.workspace_id, user_id=know.user_id, title=know.title, content=know.content,
        category=know.category, comments=know.comments, created_at=know.created_at, updated_at=know.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


# IDEAS COMMENTS
@router.post("/{workspace_id}/ideas/{idea_id}/comments", response_model=WorkspaceIdeaResponse)
async def comment_on_workspace_idea(
    workspace_id: int, idea_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    idea = await handle_comment_add(db, workspace_id, idea_id, comment_data, current_user, WorkspaceIdea, "title", "brainstorm idea")
    u_res = await db.execute(select(User).where(User.id == idea.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceIdeaResponse(
        id=idea.id, workspace_id=idea.workspace_id, user_id=idea.user_id, title=idea.title, content=idea.content,
        category=idea.category, votes=idea.votes, comments=idea.comments, created_at=idea.created_at, updated_at=idea.updated_at,
        author_name=u.full_name if u else "Unknown"
    )

@router.delete("/{workspace_id}/ideas/{idea_id}/comments/{comment_id}", response_model=WorkspaceIdeaResponse)
async def delete_workspace_idea_comment(
    workspace_id: int, idea_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    idea = await handle_comment_delete(db, workspace_id, idea_id, comment_id, current_user, membership, WorkspaceIdea, "title", "brainstorm idea")
    u_res = await db.execute(select(User).where(User.id == idea.user_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceIdeaResponse(
        id=idea.id, workspace_id=idea.workspace_id, user_id=idea.user_id, title=idea.title, content=idea.content,
        category=idea.category, votes=idea.votes, comments=idea.comments, created_at=idea.created_at, updated_at=idea.updated_at,
        author_name=u.full_name if u else "Unknown"
    )


# MEETINGS COMMENTS
@router.post("/{workspace_id}/meetings/{meeting_id}/comments", response_model=WorkspaceMeetingResponse)
async def comment_on_workspace_meeting(
    workspace_id: int, meeting_id: int, comment_data: WorkspaceNoteCommentCreate,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    meeting = await handle_comment_add(db, workspace_id, meeting_id, comment_data, current_user, WorkspaceMeeting, "title", "meeting")
    u_res = await db.execute(select(User).where(User.id == meeting.organizer_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceMeetingResponse(
        id=meeting.id, workspace_id=meeting.workspace_id, organizer_id=meeting.organizer_id, title=meeting.title,
        date=meeting.date, agenda=meeting.agenda, decisions=meeting.decisions, action_items=meeting.action_items,
        summary=meeting.summary, comments=meeting.comments, created_at=meeting.created_at, updated_at=meeting.updated_at,
        organizer_name=u.full_name if u else "Unknown"
    )

@router.delete("/{workspace_id}/meetings/{meeting_id}/comments/{comment_id}", response_model=WorkspaceMeetingResponse)
async def delete_workspace_meeting_comment(
    workspace_id: int, meeting_id: int, comment_id: str,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user), membership: WorkspaceMember = Depends(get_workspace_membership)
):
    meeting = await handle_comment_delete(db, workspace_id, meeting_id, comment_id, current_user, membership, WorkspaceMeeting, "title", "meeting")
    u_res = await db.execute(select(User).where(User.id == meeting.organizer_id))
    u = u_res.scalar_one_or_none()
    return WorkspaceMeetingResponse(
        id=meeting.id, workspace_id=meeting.workspace_id, organizer_id=meeting.organizer_id, title=meeting.title,
        date=meeting.date, agenda=meeting.agenda, decisions=meeting.decisions, action_items=meeting.action_items,
        summary=meeting.summary, comments=meeting.comments, created_at=meeting.created_at, updated_at=meeting.updated_at,
        organizer_name=u.full_name if u else "Unknown"
    )
