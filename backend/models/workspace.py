from datetime import datetime
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, func, Integer, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="💼")
    theme: Mapped[str] = mapped_column(String(100), default="purple")
    category: Mapped[str] = mapped_column(String(100), default="Project")  # Academic, Project, Startup, Personal Team, Event Planning, Research, Family
    privacy_level: Mapped[str] = mapped_column(String(50), default="Private")  # Private, Invite Only, Public
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    owner = relationship("User")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    notes = relationship("WorkspaceNote", back_populates="workspace", cascade="all, delete-orphan")
    tasks = relationship("WorkspaceTask", back_populates="workspace", cascade="all, delete-orphan")
    goals = relationship("WorkspaceGoal", back_populates="workspace", cascade="all, delete-orphan")
    discussions = relationship("WorkspaceDiscussion", back_populates="workspace", cascade="all, delete-orphan")
    knowledge = relationship("WorkspaceKnowledge", back_populates="workspace", cascade="all, delete-orphan")
    meetings = relationship("WorkspaceMeeting", back_populates="workspace", cascade="all, delete-orphan")
    ideas = relationship("WorkspaceIdea", back_populates="workspace", cascade="all, delete-orphan")
    activities = relationship("WorkspaceActivity", back_populates="workspace", cascade="all, delete-orphan")
    analytics = relationship("WorkspaceAnalytics", back_populates="workspace", cascade="all, delete-orphan")
    events = relationship("WorkspaceEvent", back_populates="workspace", cascade="all, delete-orphan")
    invites = relationship("WorkspaceInvite", back_populates="workspace", cascade="all, delete-orphan")



class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="Member")  # Owner, Admin, Member, Viewer
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User")


class WorkspaceNote(Base):
    __tablename__ = "workspace_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="notes")
    user = relationship("User")


class WorkspaceTask(Base):
    __tablename__ = "workspace_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(50), default="Medium")  # High, Medium, Low
    status: Mapped[str] = mapped_column(String(50), default="To Do")  # Backlog, To Do, In Progress, Review, Completed
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # ["bug", "frontend"]
    subtasks: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "title": str, "completed": bool}]
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assignee_id])
    creator = relationship("User", foreign_keys=[creator_id])


class WorkspaceGoal(Base):
    __tablename__ = "workspace_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0)  # 0 to 100
    milestones: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"name": str, "completed": bool}]
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="goals")
    creator = relationship("User")


class WorkspaceDiscussion(Base):
    __tablename__ = "workspace_discussions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General")  # General, Important, Questions, Updates, Ideas
    reactions: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)  # {"👍": [user_ids], "❤️": [user_ids]}
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="discussions")
    user = relationship("User")


class WorkspaceKnowledge(Base):
    __tablename__ = "workspace_knowledge"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General")  # e.g. "Algorithms", "Greedy"
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="knowledge")
    user = relationship("User")


class WorkspaceMeeting(Base):
    __tablename__ = "workspace_meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    organizer_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    agenda: Mapped[str | None] = mapped_column(Text, nullable=True)
    decisions: Mapped[str | None] = mapped_column(Text, nullable=True)
    action_items: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"task": str, "assignee": str, "due_date": str}]
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="meetings")
    organizer = relationship("User")


class WorkspaceIdea(Base):
    __tablename__ = "workspace_ideas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General")  # e.g. "AI Features", "UI Improvements"
    votes: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [user_ids] who upvoted
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="ideas")
    user = relationship("User")


class WorkspaceActivity(Base):
    __tablename__ = "workspace_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)  # "created note", "moved task", etc.
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="activities")
    user = relationship("User")


class WorkspaceAnalytics(Base):
    __tablename__ = "workspace_analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0)
    goals_achieved: Mapped[int] = mapped_column(Integer, default=0)
    contribution_score: Mapped[float] = mapped_column(Float, default=0.0)
    notes_created: Mapped[int] = mapped_column(Integer, default=0)
    participation_rate: Mapped[float] = mapped_column(Float, default=0.0)
    workspace_activity: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="analytics")
    user = relationship("User")


class WorkspaceEvent(Base):
    __tablename__ = "workspace_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    type: Mapped[str] = mapped_column(String(100), default="Event")  # Deadline, Meeting, Exam, Milestone, Event
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    comments: Mapped[list | None] = mapped_column(JSON, default=list, nullable=True)  # [{"id": str, "user_id": int, "full_name": str, "content": str, "created_at": str}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="events")
    user = relationship("User")


class WorkspaceInvite(Base):
    __tablename__ = "workspace_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    creator_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    invite_token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="invites")
    creator = relationship("User")

