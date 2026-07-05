import { create } from "zustand";
import {
  workspacesService,
  Workspace,
  WorkspaceMember,
  WorkspaceNote,
  WorkspaceTask,
  WorkspaceGoal,
  WorkspaceDiscussion,
  WorkspaceKnowledge,
  WorkspaceMeeting,
  WorkspaceIdea,
  WorkspaceEvent,
  WorkspaceActivity,
  WorkspaceLeaderboard,
  WorkspaceInvite
} from "@/services/workspaces";

interface WorkspacesState {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeModule: string;
  notes: WorkspaceNote[];
  tasks: WorkspaceTask[];
  goals: WorkspaceGoal[];
  events: WorkspaceEvent[];
  discussions: WorkspaceDiscussion[];
  knowledge: WorkspaceKnowledge[];
  ideas: WorkspaceIdea[];
  meetings: WorkspaceMeeting[];
  leaderboard: WorkspaceLeaderboard | null;
  activities: WorkspaceActivity[];
  inviteLinks: WorkspaceInvite[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Actions
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (id: number) => Promise<Workspace>;
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setActiveModule: (module: string) => void;
  createWorkspace: (data: Parameters<typeof workspacesService.createWorkspace>[0]) => Promise<Workspace>;
  updateWorkspace: (id: number, data: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspace: (id: number) => Promise<void>;
  
  // Members
  inviteMember: (workspaceId: number, email: string, role?: string) => Promise<WorkspaceMember>;
  updateMemberRole: (workspaceId: number, memberId: number, role: string) => Promise<WorkspaceMember>;
  removeMember: (workspaceId: number, memberId: number) => Promise<void>;

  // Notes
  fetchNotes: (workspaceId: number) => Promise<void>;
  createNote: (workspaceId: number, title: string, content: string, category?: string) => Promise<void>;
  updateNote: (workspaceId: number, noteId: number, data: Partial<WorkspaceNote>) => Promise<void>;
  deleteNote: (workspaceId: number, noteId: number) => Promise<void>;
  summarizeNote: (workspaceId: number, noteId: number) => Promise<void>;
  deleteNoteSummary: (workspaceId: number, noteId: number) => Promise<void>;
  commentOnNote: (workspaceId: number, noteId: number, content: string) => Promise<void>;
  deleteCommentOnNote: (workspaceId: number, noteId: number, commentId: string | number) => Promise<void>;

  // Tasks
  fetchTasks: (workspaceId: number) => Promise<void>;
  createTask: (workspaceId: number, data: Parameters<typeof workspacesService.createTask>[1]) => Promise<void>;
  updateTask: (workspaceId: number, taskId: number, data: Partial<WorkspaceTask>) => Promise<void>;
  deleteTask: (workspaceId: number, taskId: number) => Promise<void>;
  commentOnTask: (workspaceId: number, taskId: number, content: string) => Promise<void>;
  deleteCommentOnTask: (workspaceId: number, taskId: number, commentId: string | number) => Promise<void>;

  // Goals
  fetchGoals: (workspaceId: number) => Promise<void>;
  createGoal: (workspaceId: number, title: string, milestones?: { name: string; completed: boolean }[]) => Promise<void>;
  updateGoal: (workspaceId: number, goalId: number, data: Partial<WorkspaceGoal>) => Promise<void>;
  deleteGoal: (workspaceId: number, goalId: number) => Promise<void>;
  commentOnGoal: (workspaceId: number, goalId: number, content: string) => Promise<void>;
  deleteCommentOnGoal: (workspaceId: number, goalId: number, commentId: string | number) => Promise<void>;

  // Calendar Events
  fetchEvents: (workspaceId: number) => Promise<void>;
  createEvent: (workspaceId: number, data: Parameters<typeof workspacesService.createEvent>[1]) => Promise<void>;
  updateEvent: (workspaceId: number, eventId: number, data: Partial<WorkspaceEvent>) => Promise<void>;
  deleteEvent: (workspaceId: number, eventId: number) => Promise<void>;
  commentOnEvent: (workspaceId: number, eventId: number, content: string) => Promise<void>;
  deleteCommentOnEvent: (workspaceId: number, eventId: number, commentId: string | number) => Promise<void>;

  // Discussions
  fetchDiscussions: (workspaceId: number) => Promise<void>;
  createDiscussion: (workspaceId: number, title: string, content: string, category?: string) => Promise<void>;
  updateDiscussion: (workspaceId: number, discussionId: number, data: Partial<WorkspaceDiscussion>) => Promise<void>;
  deleteDiscussion: (workspaceId: number, discussionId: number) => Promise<void>;
  commentOnDiscussion: (workspaceId: number, discussionId: number, content: string) => Promise<void>;
  deleteCommentOnDiscussion: (workspaceId: number, discussionId: number, commentId: string | number) => Promise<void>;
  reactToDiscussion: (workspaceId: number, discussionId: number, emoji: string) => Promise<void>;

  // Knowledge
  fetchKnowledge: (workspaceId: number) => Promise<void>;
  createKnowledge: (workspaceId: number, title: string, content: string, category?: string) => Promise<void>;
  updateKnowledge: (workspaceId: number, knowledgeId: number, data: Partial<WorkspaceKnowledge>) => Promise<void>;
  deleteKnowledge: (workspaceId: number, knowledgeId: number) => Promise<void>;
  commentOnKnowledge: (workspaceId: number, knowledgeId: number, content: string) => Promise<void>;
  deleteCommentOnKnowledge: (workspaceId: number, knowledgeId: number, commentId: string | number) => Promise<void>;

  // Ideas
  fetchIdeas: (workspaceId: number) => Promise<void>;
  createIdea: (workspaceId: number, title: string, content: string, category?: string) => Promise<void>;
  updateIdea: (workspaceId: number, ideaId: number, data: Partial<WorkspaceIdea>) => Promise<void>;
  deleteIdea: (workspaceId: number, ideaId: number) => Promise<void>;
  voteIdea: (workspaceId: number, ideaId: number) => Promise<void>;
  commentOnIdea: (workspaceId: number, ideaId: number, content: string) => Promise<void>;
  deleteCommentOnIdea: (workspaceId: number, ideaId: number, commentId: string | number) => Promise<void>;

  // Meetings
  fetchMeetings: (workspaceId: number) => Promise<void>;
  createMeeting: (workspaceId: number, data: Parameters<typeof workspacesService.createMeeting>[1]) => Promise<void>;
  updateMeeting: (workspaceId: number, meetingId: number, data: Partial<WorkspaceMeeting>) => Promise<void>;
  deleteMeeting: (workspaceId: number, meetingId: number) => Promise<void>;
  commentOnMeeting: (workspaceId: number, meetingId: number, content: string) => Promise<void>;
  deleteCommentOnMeeting: (workspaceId: number, meetingId: number, commentId: string | number) => Promise<void>;
  generateMinutes: (workspaceId: number, meetingId: number, notes: string) => Promise<void>;

  // Analytics & Invites & Activity
  fetchAnalytics: (workspaceId: number) => Promise<void>;
  fetchActivities: (workspaceId: number) => Promise<void>;
  fetchInviteLinks: (workspaceId: number) => Promise<void>;
  generateInvite: (workspaceId: number, expiresInHours?: number) => Promise<void>;
  revokeInvite: (workspaceId: number, token: string) => Promise<void>;
  joinWithToken: (token: string) => Promise<Workspace>;
  joinPublicWorkspace: (workspaceId: number) => Promise<Workspace>;
  askAssistant: (workspaceId: number, question: string) => Promise<string>;
}

export const useWorkspacesStore = create<WorkspacesState>((set, get) => ({
  workspaces: [],
  activeWorkspace: null,
  activeModule: "notes",
  notes: [],
  tasks: [],
  goals: [],
  events: [],
  discussions: [],
  knowledge: [],
  ideas: [],
  meetings: [],
  leaderboard: null,
  activities: [],
  inviteLinks: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const workspaces = await workspacesService.getWorkspaces();
      set({ workspaces, isLoading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to fetch workspaces", isLoading: false });
    }
  },

  fetchWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const activeWorkspace = await workspacesService.getWorkspace(id);
      set({ activeWorkspace, isLoading: false });
      return activeWorkspace;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to fetch workspace", isLoading: false });
      throw e;
    }
  },

  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setActiveModule: (activeModule) => set({ activeModule }),

  createWorkspace: async (data) => {
    set({ isSaving: true, error: null });
    try {
      const newWs = await workspacesService.createWorkspace(data);
      set((state) => ({ workspaces: [...state.workspaces, newWs], isSaving: false }));
      return newWs;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to create workspace", isSaving: false });
      throw e;
    }
  },

  updateWorkspace: async (id, data) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await workspacesService.updateWorkspace(id, data);
      set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === id ? updated : w)),
        activeWorkspace: state.activeWorkspace?.id === id ? updated : state.activeWorkspace,
        isSaving: false,
      }));
      return updated;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to update workspace", isSaving: false });
      throw e;
    }
  },

  deleteWorkspace: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await workspacesService.deleteWorkspace(id);
      set((state) => ({
        workspaces: state.workspaces.filter((w) => w.id !== id),
        activeWorkspace: state.activeWorkspace?.id === id ? null : state.activeWorkspace,
        isLoading: false,
      }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to delete workspace", isLoading: false });
      throw e;
    }
  },

  // Members
  inviteMember: async (workspaceId, email, role) => {
    try {
      const member = await workspacesService.inviteMember(workspaceId, email, role);
      set((state) => {
        if (state.activeWorkspace?.id === workspaceId) {
          return {
            activeWorkspace: {
              ...state.activeWorkspace,
              members: [...state.activeWorkspace.members, member],
            },
          };
        }
        return {};
      });
      return member;
    } catch (e) {
      throw e;
    }
  },

  updateMemberRole: async (workspaceId, memberId, role) => {
    try {
      const updated = await workspacesService.updateMemberRole(workspaceId, memberId, role);
      set((state) => {
        if (state.activeWorkspace?.id === workspaceId) {
          return {
            activeWorkspace: {
              ...state.activeWorkspace,
              members: state.activeWorkspace.members.map((m) => (m.id === memberId ? updated : m)),
            },
          };
        }
        return {};
      });
      return updated;
    } catch (e) {
      throw e;
    }
  },

  removeMember: async (workspaceId, memberId) => {
    try {
      await workspacesService.removeMember(workspaceId, memberId);
      set((state) => {
        if (state.activeWorkspace?.id === workspaceId) {
          return {
            activeWorkspace: {
              ...state.activeWorkspace,
              members: state.activeWorkspace.members.filter((m) => m.id !== memberId),
            },
          };
        }
        return {};
      });
    } catch (e) {
      throw e;
    }
  },

  // Notes
  fetchNotes: async (workspaceId) => {
    try {
      const notes = await workspacesService.getNotes(workspaceId);
      set({ notes });
    } catch (e) {}
  },

  createNote: async (workspaceId, title, content, category) => {
    try {
      const newNote = await workspacesService.createNote(workspaceId, { title, content, category });
      set((state) => ({ notes: [newNote, ...state.notes] }));
    } catch (e) {
      throw e;
    }
  },

  updateNote: async (workspaceId, noteId, data) => {
    try {
      const updated = await workspacesService.updateNote(workspaceId, noteId, data);
      set((state) => ({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteNote: async (workspaceId, noteId) => {
    try {
      await workspacesService.deleteNote(workspaceId, noteId);
      set((state) => ({ notes: state.notes.filter((n) => n.id !== noteId) }));
    } catch (e) {
      throw e;
    }
  },

  summarizeNote: async (workspaceId, noteId) => {
    try {
      const updated = await workspacesService.summarizeNote(workspaceId, noteId);
      set((state) => ({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteNoteSummary: async (workspaceId, noteId) => {
    try {
      const updated = await workspacesService.deleteNoteSummary(workspaceId, noteId);
      set((state) => ({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnNote: async (workspaceId, noteId, content) => {
    try {
      const updated = await workspacesService.commentOnNote(workspaceId, noteId, content);
      set((state) => ({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnNote: async (workspaceId, noteId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnNote(workspaceId, noteId, commentId);
      set((state) => ({ notes: state.notes.map((n) => (n.id === noteId ? updated : n)) }));
    } catch (e) {
      throw e;
    }
  },

  // Tasks
  fetchTasks: async (workspaceId) => {
    try {
      const tasks = await workspacesService.getTasks(workspaceId);
      set({ tasks });
    } catch (e) {}
  },

  createTask: async (workspaceId, data) => {
    try {
      const newTask = await workspacesService.createTask(workspaceId, data);
      set((state) => ({ tasks: [...state.tasks, newTask] }));
    } catch (e) {
      throw e;
    }
  },

  updateTask: async (workspaceId, taskId, data) => {
    try {
      const updated = await workspacesService.updateTask(workspaceId, taskId, data);
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteTask: async (workspaceId, taskId) => {
    try {
      await workspacesService.deleteTask(workspaceId, taskId);
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnTask: async (workspaceId, taskId, content) => {
    try {
      const updated = await workspacesService.commentOnTask(workspaceId, taskId, content);
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnTask: async (workspaceId, taskId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnTask(workspaceId, taskId, commentId);
      set((state) => ({ tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)) }));
    } catch (e) {
      throw e;
    }
  },

  // Goals
  fetchGoals: async (workspaceId) => {
    try {
      const goals = await workspacesService.getGoals(workspaceId);
      set({ goals });
    } catch (e) {}
  },

  createGoal: async (workspaceId, title, milestones) => {
    try {
      const newGoal = await workspacesService.createGoal(workspaceId, { title, milestones });
      set((state) => ({ goals: [...state.goals, newGoal] }));
    } catch (e) {
      throw e;
    }
  },

  updateGoal: async (workspaceId, goalId, data) => {
    try {
      const updated = await workspacesService.updateGoal(workspaceId, goalId, data);
      set((state) => ({ goals: state.goals.map((g) => (g.id === goalId ? updated : g)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteGoal: async (workspaceId, goalId) => {
    try {
      await workspacesService.deleteGoal(workspaceId, goalId);
      set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnGoal: async (workspaceId, goalId, content) => {
    try {
      const updated = await workspacesService.commentOnGoal(workspaceId, goalId, content);
      set((state) => ({ goals: state.goals.map((g) => (g.id === goalId ? updated : g)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnGoal: async (workspaceId, goalId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnGoal(workspaceId, goalId, commentId);
      set((state) => ({ goals: state.goals.map((g) => (g.id === goalId ? updated : g)) }));
    } catch (e) {
      throw e;
    }
  },

  // Calendar Events
  fetchEvents: async (workspaceId) => {
    try {
      const events = await workspacesService.getEvents(workspaceId);
      set({ events });
    } catch (e) {}
  },

  createEvent: async (workspaceId, data) => {
    try {
      const newEvent = await workspacesService.createEvent(workspaceId, data);
      set((state) => ({ events: [...state.events, newEvent] }));
    } catch (e) {
      throw e;
    }
  },

  updateEvent: async (workspaceId, eventId, data) => {
    try {
      const updated = await workspacesService.updateEvent(workspaceId, eventId, data);
      set((state) => ({ events: state.events.map((ev) => (ev.id === eventId ? updated : ev)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteEvent: async (workspaceId, eventId) => {
    try {
      await workspacesService.deleteEvent(workspaceId, eventId);
      set((state) => ({ events: state.events.filter((ev) => ev.id !== eventId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnEvent: async (workspaceId, eventId, content) => {
    try {
      const updated = await workspacesService.commentOnEvent(workspaceId, eventId, content);
      set((state) => ({ events: state.events.map((ev) => (ev.id === eventId ? updated : ev)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnEvent: async (workspaceId, eventId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnEvent(workspaceId, eventId, commentId);
      set((state) => ({ events: state.events.map((ev) => (ev.id === eventId ? updated : ev)) }));
    } catch (e) {
      throw e;
    }
  },

  // Discussions
  fetchDiscussions: async (workspaceId) => {
    try {
      const discussions = await workspacesService.getDiscussions(workspaceId);
      set({ discussions });
    } catch (e) {}
  },

  createDiscussion: async (workspaceId, title, content, category) => {
    try {
      const newDisc = await workspacesService.createDiscussion(workspaceId, { title, content, category });
      set((state) => ({ discussions: [newDisc, ...state.discussions] }));
    } catch (e) {
      throw e;
    }
  },

  updateDiscussion: async (workspaceId, discussionId, data) => {
    try {
      const updated = await workspacesService.updateDiscussion(workspaceId, discussionId, data);
      set((state) => ({ discussions: state.discussions.map((d) => (d.id === discussionId ? updated : d)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteDiscussion: async (workspaceId, discussionId) => {
    try {
      await workspacesService.deleteDiscussion(workspaceId, discussionId);
      set((state) => ({ discussions: state.discussions.filter((d) => d.id !== discussionId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnDiscussion: async (workspaceId, discussionId, content) => {
    try {
      const updated = await workspacesService.commentOnDiscussion(workspaceId, discussionId, content);
      set((state) => ({ discussions: state.discussions.map((d) => (d.id === discussionId ? updated : d)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnDiscussion: async (workspaceId, discussionId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnDiscussion(workspaceId, discussionId, commentId);
      set((state) => ({ discussions: state.discussions.map((d) => (d.id === discussionId ? updated : d)) }));
    } catch (e) {
      throw e;
    }
  },

  reactToDiscussion: async (workspaceId, discussionId, emoji) => {
    try {
      const updated = await workspacesService.reactToDiscussion(workspaceId, discussionId, emoji);
      set((state) => ({ discussions: state.discussions.map((d) => (d.id === discussionId ? updated : d)) }));
    } catch (e) {
      throw e;
    }
  },

  // Knowledge
  fetchKnowledge: async (workspaceId) => {
    try {
      const knowledge = await workspacesService.getKnowledge(workspaceId);
      set({ knowledge });
    } catch (e) {}
  },

  createKnowledge: async (workspaceId, title, content, category) => {
    try {
      const newKnow = await workspacesService.createKnowledge(workspaceId, { title, content, category });
      set((state) => ({ knowledge: [newKnow, ...state.knowledge] }));
    } catch (e) {
      throw e;
    }
  },

  updateKnowledge: async (workspaceId, knowledgeId, data) => {
    try {
      const updated = await workspacesService.updateKnowledge(workspaceId, knowledgeId, data);
      set((state) => ({ knowledge: state.knowledge.map((k) => (k.id === knowledgeId ? updated : k)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteKnowledge: async (workspaceId, knowledgeId) => {
    try {
      await workspacesService.deleteKnowledge(workspaceId, knowledgeId);
      set((state) => ({ knowledge: state.knowledge.filter((k) => k.id !== knowledgeId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnKnowledge: async (workspaceId, knowledgeId, content) => {
    try {
      const updated = await workspacesService.commentOnKnowledge(workspaceId, knowledgeId, content);
      set((state) => ({ knowledge: state.knowledge.map((k) => (k.id === knowledgeId ? updated : k)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnKnowledge: async (workspaceId, knowledgeId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnKnowledge(workspaceId, knowledgeId, commentId);
      set((state) => ({ knowledge: state.knowledge.map((k) => (k.id === knowledgeId ? updated : k)) }));
    } catch (e) {
      throw e;
    }
  },

  // Ideas
  fetchIdeas: async (workspaceId) => {
    try {
      const ideas = await workspacesService.getIdeas(workspaceId);
      set({ ideas });
    } catch (e) {}
  },

  createIdea: async (workspaceId, title, content, category) => {
    try {
      const newIdea = await workspacesService.createIdea(workspaceId, { title, content, category });
      set((state) => ({ ideas: [newIdea, ...state.ideas] }));
    } catch (e) {
      throw e;
    }
  },

  updateIdea: async (workspaceId, ideaId, data) => {
    try {
      const updated = await workspacesService.updateIdea(workspaceId, ideaId, data);
      set((state) => ({ ideas: state.ideas.map((i) => (i.id === ideaId ? updated : i)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteIdea: async (workspaceId, ideaId) => {
    try {
      await workspacesService.deleteIdea(workspaceId, ideaId);
      set((state) => ({ ideas: state.ideas.filter((i) => i.id !== ideaId) }));
    } catch (e) {
      throw e;
    }
  },

  voteIdea: async (workspaceId, ideaId) => {
    try {
      const updated = await workspacesService.voteIdea(workspaceId, ideaId);
      set((state) => ({ ideas: state.ideas.map((i) => (i.id === ideaId ? updated : i)) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnIdea: async (workspaceId, ideaId, content) => {
    try {
      const updated = await workspacesService.commentOnIdea(workspaceId, ideaId, content);
      set((state) => ({ ideas: state.ideas.map((i) => (i.id === ideaId ? updated : i)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnIdea: async (workspaceId, ideaId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnIdea(workspaceId, ideaId, commentId);
      set((state) => ({ ideas: state.ideas.map((i) => (i.id === ideaId ? updated : i)) }));
    } catch (e) {
      throw e;
    }
  },

  // Meetings
  fetchMeetings: async (workspaceId) => {
    try {
      const meetings = await workspacesService.getMeetings(workspaceId);
      set({ meetings });
    } catch (e) {}
  },

  createMeeting: async (workspaceId, data) => {
    try {
      const newMeeting = await workspacesService.createMeeting(workspaceId, data);
      set((state) => ({ meetings: [...state.meetings, newMeeting] }));
    } catch (e) {
      throw e;
    }
  },

  updateMeeting: async (workspaceId, meetingId, data) => {
    try {
      const updated = await workspacesService.updateMeeting(workspaceId, meetingId, data);
      set((state) => ({ meetings: state.meetings.map((m) => (m.id === meetingId ? updated : m)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteMeeting: async (workspaceId, meetingId) => {
    try {
      await workspacesService.deleteMeeting(workspaceId, meetingId);
      set((state) => ({ meetings: state.meetings.filter((m) => m.id !== meetingId) }));
    } catch (e) {
      throw e;
    }
  },

  commentOnMeeting: async (workspaceId, meetingId, content) => {
    try {
      const updated = await workspacesService.commentOnMeeting(workspaceId, meetingId, content);
      set((state) => ({ meetings: state.meetings.map((m) => (m.id === meetingId ? updated : m)) }));
    } catch (e) {
      throw e;
    }
  },

  deleteCommentOnMeeting: async (workspaceId, meetingId, commentId) => {
    try {
      const updated = await workspacesService.deleteCommentOnMeeting(workspaceId, meetingId, commentId);
      set((state) => ({ meetings: state.meetings.map((m) => (m.id === meetingId ? updated : m)) }));
    } catch (e) {
      throw e;
    }
  },

  generateMinutes: async (workspaceId, meetingId, notes) => {
    try {
      const updated = await workspacesService.generateMinutes(workspaceId, meetingId, notes);
      set((state) => ({ meetings: state.meetings.map((m) => (m.id === meetingId ? updated : m)) }));
    } catch (e) {
      throw e;
    }
  },

  // Analytics & Invites & Activity
  fetchAnalytics: async (workspaceId) => {
    try {
      const leaderboard = await workspacesService.getAnalytics(workspaceId);
      set({ leaderboard });
    } catch (e) {}
  },

  fetchActivities: async (workspaceId) => {
    try {
      const activities = await workspacesService.getActivities(workspaceId);
      set({ activities });
    } catch (e) {}
  },

  fetchInviteLinks: async (workspaceId) => {
    try {
      const inviteLinks = await workspacesService.listInvites(workspaceId);
      set({ inviteLinks });
    } catch (e) {}
  },

  generateInvite: async (workspaceId, expiresInHours) => {
    try {
      await workspacesService.generateInvite(workspaceId, expiresInHours);
      const inviteLinks = await workspacesService.listInvites(workspaceId);
      set({ inviteLinks });
    } catch (e) {
      throw e;
    }
  },

  revokeInvite: async (workspaceId, token) => {
    try {
      await workspacesService.revokeInvite(workspaceId, token);
      const inviteLinks = await workspacesService.listInvites(workspaceId);
      set({ inviteLinks });
    } catch (e) {
      throw e;
    }
  },

  joinWithToken: async (token) => {
    try {
      const ws = await workspacesService.joinWithToken(token);
      set((state) => ({ workspaces: [...state.workspaces, ws] }));
      return ws;
    } catch (e) {
      throw e;
    }
  },

  joinPublicWorkspace: async (workspaceId) => {
    try {
      const ws = await workspacesService.joinPublicWorkspace(workspaceId);
      set((state) => ({ workspaces: [...state.workspaces, ws] }));
      return ws;
    } catch (e) {
      throw e;
    }
  },

  askAssistant: async (workspaceId, question) => {
    try {
      const res = await workspacesService.askAssistant(workspaceId, question);
      return res.response;
    } catch (e) {
      throw e;
    }
  },
}));
