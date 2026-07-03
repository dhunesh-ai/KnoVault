/**
 * KnoVault — Workspaces API Functions
 */
import client from './client';

export interface WorkspaceInvite {
  id: number;
  workspace_id: number;
  creator_id: number;
  invite_token: string;
  expires_at: string | null;
  is_revoked: boolean;
  created_at: string;
}

export interface WorkspaceMember {

  id: number;
  workspace_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  user_email?: string;
  user_full_name?: string;
}

export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  icon: string;
  theme: string;
  category: string;
  privacy_level: string;
  created_at: string;
  updated_at: string;
  owner_id: number;
  owner_name: string | null;
  members: WorkspaceMember[];
}

export interface WorkspaceNote {
  id: number;
  workspace_id: number;
  user_id: number;
  title: string;
  content: string;
  category: string | null;
  ai_summary: string | null;
  comments: any[];
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface WorkspaceTask {
  id: number;
  workspace_id: number;
  assignee_id: number | null;
  creator_id: number;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  progress: number;
  tags: string[];
  subtasks: { id: string; title: string; completed: boolean }[];
  comments: any[];
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  creator_name?: string;
}

export interface WorkspaceGoal {
  id: number;
  workspace_id: number;
  creator_id: number;
  title: string;
  progress: number;
  milestones: { name: string; completed: boolean }[];
  comments: any[];
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface WorkspaceDiscussion {
  id: number;
  workspace_id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  reactions: Record<string, number[]>;
  comments: any[];
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface WorkspaceKnowledge {
  id: number;
  workspace_id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  comments: any[];
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface WorkspaceMeeting {
  id: number;
  workspace_id: number;
  organizer_id: number;
  title: string;
  date: string;
  agenda: string | null;
  decisions: string | null;
  action_items: { task: string; assignee: string; due_date: string }[];
  summary: string | null;
  comments: any[];
  created_at: string;
  updated_at: string;
  organizer_name?: string;
}

export interface WorkspaceIdea {
  id: number;
  workspace_id: number;
  user_id: number;
  title: string;
  content: string;
  category: string;
  votes: number[];
  comments: any[];
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface WorkspaceEvent {
  id: number;
  workspace_id: number;
  user_id: number;
  title: string;
  description: string | null;
  type: string;
  date: string;
  comments: any[];
  created_at: string;
  updated_at: string;
  creator_name?: string;
}

export interface WorkspaceActivity {
  id: number;
  workspace_id: number;
  user_id: number;
  action: string;
  details: string | null;
  timestamp: string;
  user_name?: string;
}

export interface WorkspaceAnalytics {
  user_id: number;
  user_name: string;
  tasks_completed: number;
  goals_achieved: number;
  contribution_score: number;
  notes_created: number;
  participation_rate: number;
  workspace_activity: number;
}

export interface WorkspaceLeaderboard {
  members: WorkspaceAnalytics[];
  top_contributor: WorkspaceAnalytics | null;
  most_productive: WorkspaceAnalytics | null;
  knowledge_champion: WorkspaceAnalytics | null;
}

export const workspacesApi = {
  // ── Workspaces ──────────────────────────────────────────────────
  getWorkspaces: async (): Promise<Workspace[]> => {
    const res = await client.get<Workspace[]>('/api/workspaces');
    return res.data;
  },

  getWorkspace: async (id: number): Promise<Workspace> => {
    const res = await client.get<Workspace>(`/api/workspaces/${id}`);
    return res.data;
  },

  createWorkspace: async (data: {
    name: string;
    description?: string;
    icon: string;
    theme: string;
    category: string;
    privacy_level: string;
  }): Promise<Workspace> => {
    const res = await client.post<Workspace>('/api/workspaces', data);
    return res.data;
  },

  updateWorkspace: async (id: number, data: Partial<Workspace>): Promise<Workspace> => {
    const res = await client.put<Workspace>(`/api/workspaces/${id}`, data);
    return res.data;
  },

  deleteWorkspace: async (id: number): Promise<void> => {
    await client.delete(`/api/workspaces/${id}`);
  },

  // ── Members ─────────────────────────────────────────────────────
  inviteMember: async (workspaceId: number, email: string, role = 'Member'): Promise<WorkspaceMember> => {
    const res = await client.post<WorkspaceMember>(`/api/workspaces/${workspaceId}/members`, { email, role });
    return res.data;
  },

  updateMemberRole: async (workspaceId: number, memberId: number, role: string): Promise<WorkspaceMember> => {
    const res = await client.put<WorkspaceMember>(`/api/workspaces/${workspaceId}/members/${memberId}`, { role });
    return res.data;
  },

  removeMember: async (workspaceId: number, memberId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
  },

  // ── Notes ───────────────────────────────────────────────────────
  getNotes: async (workspaceId: number): Promise<WorkspaceNote[]> => {
    const res = await client.get<WorkspaceNote[]>(`/api/workspaces/${workspaceId}/notes`);
    return res.data;
  },

  createNote: async (workspaceId: number, data: { title: string; content: string; category?: string }): Promise<WorkspaceNote> => {
    const res = await client.post<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes`, data);
    return res.data;
  },

  updateNote: async (workspaceId: number, noteId: number, data: Partial<WorkspaceNote>): Promise<WorkspaceNote> => {
    const res = await client.put<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}`, data);
    return res.data;
  },

  summarizeNote: async (workspaceId: number, noteId: number): Promise<WorkspaceNote> => {
    const res = await client.post<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}/summarize`);
    return res.data;
  },

  deleteNoteSummary: async (workspaceId: number, noteId: number): Promise<WorkspaceNote> => {
    const res = await client.delete<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}/summary`);
    return res.data;
  },

  getNote: async (workspaceId: number, noteId: number): Promise<WorkspaceNote> => {
    const res = await client.get<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}`);
    return res.data;
  },

  getNoteComments: async (workspaceId: number, noteId: number): Promise<any[]> => {
    const res = await client.get<any[]>(`/api/workspaces/${workspaceId}/notes/${noteId}/comments`);
    return res.data;
  },



  deleteNote: async (workspaceId: number, noteId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/notes/${noteId}`);
  },

  commentOnNote: async (workspaceId: number, noteId: number, content: string): Promise<WorkspaceNote> => {
    const res = await client.post<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnNote: async (workspaceId: number, noteId: number, commentId: string): Promise<WorkspaceNote> => {
    const res = await client.delete<WorkspaceNote>(`/api/workspaces/${workspaceId}/notes/${noteId}/comments/${commentId}`);
    return res.data;
  },


  // ── Tasks ───────────────────────────────────────────────────────
  getTasks: async (workspaceId: number): Promise<WorkspaceTask[]> => {
    const res = await client.get<WorkspaceTask[]>(`/api/workspaces/${workspaceId}/tasks`);
    return res.data;
  },

  createTask: async (workspaceId: number, data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    due_date?: string;
    assignee_id?: number;
    tags?: string[];
    subtasks?: { id: string; title: string; completed: boolean }[];
  }): Promise<WorkspaceTask> => {
    const res = await client.post<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks`, data);
    return res.data;
  },

  updateTask: async (workspaceId: number, taskId: number, data: Partial<WorkspaceTask>): Promise<WorkspaceTask> => {
    const res = await client.put<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks/${taskId}`, data);
    return res.data;
  },

  deleteTask: async (workspaceId: number, taskId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/tasks/${taskId}`);
  },

  commentOnTask: async (workspaceId: number, taskId: number, content: string): Promise<WorkspaceTask> => {
    const res = await client.post<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnTask: async (workspaceId: number, taskId: number, commentId: string): Promise<WorkspaceTask> => {
    const res = await client.delete<WorkspaceTask>(`/api/workspaces/${workspaceId}/tasks/${taskId}/comments/${commentId}`);
    return res.data;
  },

  // ── Goals ───────────────────────────────────────────────────────
  getGoals: async (workspaceId: number): Promise<WorkspaceGoal[]> => {
    const res = await client.get<WorkspaceGoal[]>(`/api/workspaces/${workspaceId}/goals`);
    return res.data;
  },

  createGoal: async (workspaceId: number, data: { title: string; milestones?: { name: string; completed: boolean }[] }): Promise<WorkspaceGoal> => {
    const res = await client.post<WorkspaceGoal>(`/api/workspaces/${workspaceId}/goals`, data);
    return res.data;
  },

  updateGoal: async (workspaceId: number, goalId: number, data: Partial<WorkspaceGoal>): Promise<WorkspaceGoal> => {
    const res = await client.put<WorkspaceGoal>(`/api/workspaces/${workspaceId}/goals/${goalId}`, data);
    return res.data;
  },

  deleteGoal: async (workspaceId: number, goalId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/goals/${goalId}`);
  },

  commentOnGoal: async (workspaceId: number, goalId: number, content: string): Promise<WorkspaceGoal> => {
    const res = await client.post<WorkspaceGoal>(`/api/workspaces/${workspaceId}/goals/${goalId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnGoal: async (workspaceId: number, goalId: number, commentId: string): Promise<WorkspaceGoal> => {
    const res = await client.delete<WorkspaceGoal>(`/api/workspaces/${workspaceId}/goals/${goalId}/comments/${commentId}`);
    return res.data;
  },

  // ── Calendar Events ─────────────────────────────────────────────
  getEvents: async (workspaceId: number): Promise<WorkspaceEvent[]> => {
    const res = await client.get<WorkspaceEvent[]>(`/api/workspaces/${workspaceId}/events`);
    return res.data;
  },

  createEvent: async (workspaceId: number, data: { title: string; description?: string; type?: string; date: string }): Promise<WorkspaceEvent> => {
    const res = await client.post<WorkspaceEvent>(`/api/workspaces/${workspaceId}/events`, data);
    return res.data;
  },

  updateEvent: async (workspaceId: number, eventId: number, data: Partial<WorkspaceEvent>): Promise<WorkspaceEvent> => {
    const res = await client.put<WorkspaceEvent>(`/api/workspaces/${workspaceId}/events/${eventId}`, data);
    return res.data;
  },

  deleteEvent: async (workspaceId: number, eventId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/events/${eventId}`);
  },

  commentOnEvent: async (workspaceId: number, eventId: number, content: string): Promise<WorkspaceEvent> => {
    const res = await client.post<WorkspaceEvent>(`/api/workspaces/${workspaceId}/events/${eventId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnEvent: async (workspaceId: number, eventId: number, commentId: string): Promise<WorkspaceEvent> => {
    const res = await client.delete<WorkspaceEvent>(`/api/workspaces/${workspaceId}/events/${eventId}/comments/${commentId}`);
    return res.data;
  },

  checkConflicts: async (workspaceId: number): Promise<{ report: string }> => {
    const res = await client.post<{ report: string }>(`/api/workspaces/${workspaceId}/events/conflict-check`);
    return res.data;
  },

  // ── Discussions ─────────────────────────────────────────────────
  getDiscussions: async (workspaceId: number): Promise<WorkspaceDiscussion[]> => {
    const res = await client.get<WorkspaceDiscussion[]>(`/api/workspaces/${workspaceId}/discussions`);
    return res.data;
  },

  createDiscussion: async (workspaceId: number, data: { title: string; content: string; category?: string }): Promise<WorkspaceDiscussion> => {
    const res = await client.post<WorkspaceDiscussion>(`/api/workspaces/${workspaceId}/discussions`, data);
    return res.data;
  },

  updateDiscussion: async (workspaceId: number, discussionId: number, data: Partial<WorkspaceDiscussion>): Promise<WorkspaceDiscussion> => {
    const res = await client.put<WorkspaceDiscussion>(`/api/workspaces/${workspaceId}/discussions/${discussionId}`, data);
    return res.data;
  },

  deleteDiscussion: async (workspaceId: number, discussionId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/discussions/${discussionId}`);
  },

  commentOnDiscussion: async (workspaceId: number, discussionId: number, content: string): Promise<WorkspaceDiscussion> => {
    const res = await client.post<WorkspaceDiscussion>(`/api/workspaces/${workspaceId}/discussions/${discussionId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnDiscussion: async (workspaceId: number, discussionId: number, commentId: string): Promise<WorkspaceDiscussion> => {
    const res = await client.delete<WorkspaceDiscussion>(`/api/workspaces/${workspaceId}/discussions/${discussionId}/comments/${commentId}`);
    return res.data;
  },

  reactToDiscussion: async (workspaceId: number, discussionId: number, emoji: string): Promise<WorkspaceDiscussion> => {
    const res = await client.post<WorkspaceDiscussion>(`/api/workspaces/${workspaceId}/discussions/${discussionId}/reactions`, null, {
      params: { emoji }
    });
    return res.data;
  },

  // ── Knowledge Wall ──────────────────────────────────────────────
  getKnowledge: async (workspaceId: number): Promise<WorkspaceKnowledge[]> => {
    const res = await client.get<WorkspaceKnowledge[]>(`/api/workspaces/${workspaceId}/knowledge`);
    return res.data;
  },

  createKnowledge: async (workspaceId: number, data: { title: string; content: string; category?: string }): Promise<WorkspaceKnowledge> => {
    const res = await client.post<WorkspaceKnowledge>(`/api/workspaces/${workspaceId}/knowledge`, data);
    return res.data;
  },

  updateKnowledge: async (workspaceId: number, knowledgeId: number, data: Partial<WorkspaceKnowledge>): Promise<WorkspaceKnowledge> => {
    const res = await client.put<WorkspaceKnowledge>(`/api/workspaces/${workspaceId}/knowledge/${knowledgeId}`, data);
    return res.data;
  },

  deleteKnowledge: async (workspaceId: number, knowledgeId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/knowledge/${knowledgeId}`);
  },

  commentOnKnowledge: async (workspaceId: number, knowledgeId: number, content: string): Promise<WorkspaceKnowledge> => {
    const res = await client.post<WorkspaceKnowledge>(`/api/workspaces/${workspaceId}/knowledge/${knowledgeId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnKnowledge: async (workspaceId: number, knowledgeId: number, commentId: string): Promise<WorkspaceKnowledge> => {
    const res = await client.delete<WorkspaceKnowledge>(`/api/workspaces/${workspaceId}/knowledge/${knowledgeId}/comments/${commentId}`);
    return res.data;
  },

  organizeKnowledge: async (workspaceId: number): Promise<{ tree: string }> => {
    const res = await client.post<{ tree: string }>(`/api/workspaces/${workspaceId}/knowledge/organize`);
    return res.data;
  },

  // ── Brainstorm Board ────────────────────────────────────────────
  getIdeas: async (workspaceId: number): Promise<WorkspaceIdea[]> => {
    const res = await client.get<WorkspaceIdea[]>(`/api/workspaces/${workspaceId}/ideas`);
    return res.data;
  },

  createIdea: async (workspaceId: number, data: { title: string; content: string; category?: string }): Promise<WorkspaceIdea> => {
    const res = await client.post<WorkspaceIdea>(`/api/workspaces/${workspaceId}/ideas`, data);
    return res.data;
  },

  updateIdea: async (workspaceId: number, ideaId: number, data: Partial<WorkspaceIdea>): Promise<WorkspaceIdea> => {
    const res = await client.put<WorkspaceIdea>(`/api/workspaces/${workspaceId}/ideas/${ideaId}`, data);
    return res.data;
  },

  deleteIdea: async (workspaceId: number, ideaId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/ideas/${ideaId}`);
  },

  commentOnIdea: async (workspaceId: number, ideaId: number, content: string): Promise<WorkspaceIdea> => {
    const res = await client.post<WorkspaceIdea>(`/api/workspaces/${workspaceId}/ideas/${ideaId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnIdea: async (workspaceId: number, ideaId: number, commentId: string): Promise<WorkspaceIdea> => {
    const res = await client.delete<WorkspaceIdea>(`/api/workspaces/${workspaceId}/ideas/${ideaId}/comments/${commentId}`);
    return res.data;
  },

  voteIdea: async (workspaceId: number, ideaId: number): Promise<WorkspaceIdea> => {
    const res = await client.post<WorkspaceIdea>(`/api/workspaces/${workspaceId}/ideas/${ideaId}/vote`);
    return res.data;
  },

  clusterIdeas: async (workspaceId: number): Promise<{ report: string }> => {
    const res = await client.post<{ report: string }>(`/api/workspaces/${workspaceId}/ideas/cluster`);
    return res.data;
  },

  // ── Meeting Center ──────────────────────────────────────────────
  getMeetings: async (workspaceId: number): Promise<WorkspaceMeeting[]> => {
    const res = await client.get<WorkspaceMeeting[]>(`/api/workspaces/${workspaceId}/meetings`);
    return res.data;
  },

  createMeeting: async (workspaceId: number, data: { title: string; date: string; agenda?: string }): Promise<WorkspaceMeeting> => {
    const res = await client.post<WorkspaceMeeting>(`/api/workspaces/${workspaceId}/meetings`, data);
    return res.data;
  },

  updateMeeting: async (workspaceId: number, meetingId: number, data: Partial<WorkspaceMeeting>): Promise<WorkspaceMeeting> => {
    const res = await client.put<WorkspaceMeeting>(`/api/workspaces/${workspaceId}/meetings/${meetingId}`, data);
    return res.data;
  },

  deleteMeeting: async (workspaceId: number, meetingId: number): Promise<void> => {
    await client.delete(`/api/workspaces/${workspaceId}/meetings/${meetingId}`);
  },

  commentOnMeeting: async (workspaceId: number, meetingId: number, content: string): Promise<WorkspaceMeeting> => {
    const res = await client.post<WorkspaceMeeting>(`/api/workspaces/${workspaceId}/meetings/${meetingId}/comments`, { content });
    return res.data;
  },

  deleteCommentOnMeeting: async (workspaceId: number, meetingId: number, commentId: string): Promise<WorkspaceMeeting> => {
    const res = await client.delete<WorkspaceMeeting>(`/api/workspaces/${workspaceId}/meetings/${meetingId}/comments/${commentId}`);
    return res.data;
  },

  generateMinutes: async (workspaceId: number, meetingId: number, notes: string): Promise<WorkspaceMeeting> => {
    const res = await client.post<WorkspaceMeeting>(`/api/workspaces/${workspaceId}/meetings/${meetingId}/minutes`, null, {
      params: { meeting_notes: notes }
    });
    return res.data;
  },

  // ── Analytics ───────────────────────────────────────────────────
  getAnalytics: async (workspaceId: number): Promise<WorkspaceLeaderboard> => {
    const res = await client.get<WorkspaceLeaderboard>(`/api/workspaces/${workspaceId}/analytics`);
    return res.data;
  },

  // ── Activity History ────────────────────────────────────────────
  getActivities: async (workspaceId: number): Promise<WorkspaceActivity[]> => {
    const res = await client.get<WorkspaceActivity[]>(`/api/workspaces/${workspaceId}/activity`);
    return res.data;
  },

  // ── AI Assistant ────────────────────────────────────────────────
  askAssistant: async (workspaceId: number, question: string): Promise<{ response: string }> => {
    const res = await client.post<{ response: string }>(`/api/workspaces/${workspaceId}/ai/assistant`, { message: question });
    return res.data;
  },

  // ── Invite Links ────────────────────────────────────────────────
  generateInvite: async (workspaceId: number, expiresInHours?: number): Promise<WorkspaceInvite> => {
    const res = await client.post<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invites`, {
      expires_in_hours: expiresInHours
    });
    return res.data;
  },

  listInvites: async (workspaceId: number): Promise<WorkspaceInvite[]> => {
    const res = await client.get<WorkspaceInvite[]>(`/api/workspaces/${workspaceId}/invites`);
    return res.data;
  },

  revokeInvite: async (workspaceId: number, token: string): Promise<WorkspaceInvite> => {
    const res = await client.post<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invites/${token}/revoke`);
    return res.data;
  },

  joinWithToken: async (token: string): Promise<Workspace> => {
    const res = await client.post<Workspace>(`/api/workspaces/join/token/${token}`);
    return res.data;
  },

  joinPublicWorkspace: async (workspaceId: number): Promise<Workspace> => {
    const res = await client.post<Workspace>(`/api/workspaces/${workspaceId}/join`);
    return res.data;
  }
} as const;

