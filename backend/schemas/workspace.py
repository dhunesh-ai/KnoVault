from datetime import datetime
from pydantic import BaseModel, Field
from typing import Any


# ── Member Schemas ─────────────────────────────────────────────────
class WorkspaceMemberResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    role: str
    joined_at: datetime
    user_email: str | None = None
    user_full_name: str | None = None

    class Config:
        from_attributes = True


class WorkspaceMemberInvite(BaseModel):
    email: str
    role: str = "Member"  # Owner, Admin, Member, Viewer


class WorkspaceMemberUpdate(BaseModel):
    role: str


# ── Workspace Schemas ──────────────────────────────────────────────
class WorkspaceCreate(BaseModel):
    name: str
    description: str | None = None
    icon: str = "💼"
    theme: str = "purple"
    category: str = "Project"
    privacy_level: str = "Private"


class WorkspaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    icon: str | None = None
    theme: str | None = None
    category: str | None = None
    privacy_level: str | None = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: str | None
    icon: str
    theme: str
    category: str
    privacy_level: str
    created_at: datetime
    updated_at: datetime
    owner_id: int
    owner_name: str | None = None
    members: list[WorkspaceMemberResponse] = []

    class Config:
        from_attributes = True


# ── Note Schemas ───────────────────────────────────────────────────
class WorkspaceNoteCommentCreate(BaseModel):
    content: str


class WorkspaceNoteCreate(BaseModel):
    title: str
    content: str
    category: str | None = None


class WorkspaceNoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class WorkspaceNoteResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    title: str
    content: str
    category: str | None
    ai_summary: str | None
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None

    class Config:
        from_attributes = True


# ── Task Schemas ───────────────────────────────────────────────────
class WorkspaceTaskCommentCreate(BaseModel):
    content: str


class WorkspaceTaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: str = "Medium"
    status: str = "To Do"
    due_date: datetime | None = None
    assignee_id: int | None = None
    tags: list[str] = Field(default_factory=list)
    subtasks: list[dict] = Field(default_factory=list)


class WorkspaceTaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    due_date: datetime | None = None
    assignee_id: int | None = None
    progress: int | None = None
    tags: list[str] | None = None
    subtasks: list[dict] | None = None


class WorkspaceTaskResponse(BaseModel):
    id: int
    workspace_id: int
    assignee_id: int | None
    creator_id: int
    title: str
    description: str | None
    priority: str
    status: str
    due_date: datetime | None
    progress: int
    tags: list[str] | None = []
    subtasks: list[dict] | None = []
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    assignee_name: str | None = None
    creator_name: str | None = None

    class Config:
        from_attributes = True


# ── Goal Schemas ───────────────────────────────────────────────────
class WorkspaceGoalCreate(BaseModel):
    title: str
    milestones: list[dict] = Field(default_factory=list)  # [{"name": "Step 1", "completed": false}]


class WorkspaceGoalUpdate(BaseModel):
    title: str | None = None
    milestones: list[dict] | None = None
    progress: int | None = None


class WorkspaceGoalResponse(BaseModel):
    id: int
    workspace_id: int
    creator_id: int
    title: str
    progress: int
    milestones: list[dict] | None = []
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    creator_name: str | None = None

    class Config:
        from_attributes = True


# ── Discussion Schemas ─────────────────────────────────────────────
class WorkspaceDiscussionCreate(BaseModel):
    title: str
    content: str
    category: str = "General"


class WorkspaceDiscussionUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class WorkspaceDiscussionResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    title: str
    content: str
    category: str
    reactions: dict | None = {}
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None

    class Config:
        from_attributes = True


# ── Knowledge Schemas ──────────────────────────────────────────────
class WorkspaceKnowledgeCreate(BaseModel):
    title: str
    content: str
    category: str = "General"


class WorkspaceKnowledgeUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class WorkspaceKnowledgeResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    title: str
    content: str
    category: str
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None

    class Config:
        from_attributes = True


# ── Meeting Schemas ────────────────────────────────────────────────
class WorkspaceMeetingCreate(BaseModel):
    title: str
    date: datetime
    agenda: str | None = None


class WorkspaceMeetingUpdate(BaseModel):
    title: str | None = None
    date: datetime | None = None
    agenda: str | None = None
    decisions: str | None = None
    action_items: list[dict] | None = None
    summary: str | None = None


class WorkspaceMeetingResponse(BaseModel):
    id: int
    workspace_id: int
    organizer_id: int
    title: str
    date: datetime
    agenda: str | None
    decisions: str | None
    action_items: list[dict] | None = []
    summary: str | None
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    organizer_name: str | None = None

    class Config:
        from_attributes = True


# ── Idea Schemas ───────────────────────────────────────────────────
class WorkspaceIdeaCreate(BaseModel):
    title: str
    content: str
    category: str = "General"


class WorkspaceIdeaUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    category: str | None = None


class WorkspaceIdeaResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    title: str
    content: str
    category: str
    votes: list[int] | None = []
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    author_name: str | None = None

    class Config:
        from_attributes = True


# ── Event Schemas ──────────────────────────────────────────────────
class WorkspaceEventCreate(BaseModel):
    title: str
    description: str | None = None
    type: str = "Event"
    date: datetime


class WorkspaceEventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    date: datetime | None = None


class WorkspaceEventResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    title: str
    description: str | None
    type: str
    date: datetime
    comments: list[Any] | None = []
    created_at: datetime
    updated_at: datetime
    creator_name: str | None = None

    class Config:
        from_attributes = True


# ── Activity Schemas ───────────────────────────────────────────────
class WorkspaceActivityResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    action: str
    details: str | None
    timestamp: datetime
    user_name: str | None = None

    class Config:
        from_attributes = True


# ── Analytics Schemas ──────────────────────────────────────────────
class WorkspaceAnalyticsResponse(BaseModel):
    user_id: int
    user_name: str
    tasks_completed: int
    goals_achieved: int
    contribution_score: float
    notes_created: int
    participation_rate: float
    workspace_activity: int


class WorkspaceLeaderboardResponse(BaseModel):
    members: list[WorkspaceAnalyticsResponse]
    top_contributor: WorkspaceAnalyticsResponse | None = None
    most_productive: WorkspaceAnalyticsResponse | None = None
    knowledge_champion: WorkspaceAnalyticsResponse | None = None


# ── AI Assistant Schemas ───────────────────────────────────────────
class WorkspaceAIAssistantRequest(BaseModel):
    message: str


class WorkspaceAIAssistantResponse(BaseModel):
    response: str


# ── Invite Schemas ─────────────────────────────────────────────────
class WorkspaceInviteCreate(BaseModel):
    expires_in_hours: int | None = None


class WorkspaceInviteResponse(BaseModel):
    id: int
    workspace_id: int
    creator_id: int
    invite_token: str
    expires_at: datetime | None
    is_revoked: bool
    created_at: datetime

    class Config:
        from_attributes = True

