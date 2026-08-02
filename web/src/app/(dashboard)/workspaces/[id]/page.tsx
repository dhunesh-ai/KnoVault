"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorkspacesStore } from "@/store/useWorkspacesStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  StickyNote, 
  ListTodo, 
  TrendingUp, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  Lightbulb, 
  Users, 
  Sparkles, 
  BarChart3, 
  Settings, 
  Plus, 
  Trash2, 
  Edit, 
  MessageCircle, 
  Check, 
  AlertCircle, 
  Trophy, 
  CalendarDays, 
  Copy, 
  Share2, 
  UserPlus, 
  ChevronRight,
  Brain,
  Vote,
  Sparkle,
  Loader2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MODULES = [
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "tasks", label: "Kanban", icon: ListTodo },
  { id: "goals", label: "Goals", icon: TrendingUp },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "discussions", label: "Discussions", icon: MessageSquare },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "brainstorm", label: "Brainstorm", icon: Lightbulb },
  { id: "meetings", label: "Meetings", icon: Users },
  { id: "analytics", label: "Leaderboard", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const THEME_ACCENTS: Record<string, string> = {
  purple: "text-purple-400 border-purple-500 bg-purple-500/10",
  blue: "text-blue-400 border-blue-500 bg-blue-500/10",
  emerald: "text-emerald-400 border-emerald-500 bg-emerald-500/10",
  amber: "text-amber-400 border-amber-500 bg-amber-500/10",
  rose: "text-rose-400 border-rose-500 bg-rose-500/10",
};

const THEME_BUTTONS: Record<string, string> = {
  purple: "bg-purple-600 hover:bg-purple-700 shadow-[0_0_15px_rgba(124,77,255,0.4)]",
  blue: "bg-blue-600 hover:bg-blue-700 shadow-[0_0_15px_rgba(41,121,255,0.4)]",
  emerald: "bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(0,230,118,0.4)]",
  amber: "bg-amber-600 hover:bg-amber-700 shadow-[0_0_15px_rgba(255,196,0,0.4)]",
  rose: "bg-rose-600 hover:bg-rose-700 shadow-[0_0_15px_rgba(255,23,68,0.4)]",
};

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const workspaceId = parseInt(params.id as string || "0");

  const {
    activeWorkspace,
    activeModule,
    isLoading,
    fetchWorkspace,
    setActiveModule,
    deleteWorkspace,
    updateWorkspace,
    
    // Notes Store
    notes,
    fetchNotes,
    createNote,
    updateNote,
    deleteNote,
    summarizeNote,
    deleteNoteSummary,
    commentOnNote,
    deleteCommentOnNote,

    // Tasks Store
    tasks,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    commentOnTask,
    deleteCommentOnTask,

    // Goals Store
    goals,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    commentOnGoal,
    deleteCommentOnGoal,

    // Calendar Events Store
    events,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    commentOnEvent,
    deleteCommentOnEvent,

    // Discussions Store
    discussions,
    fetchDiscussions,
    createDiscussion,
    updateDiscussion,
    deleteDiscussion,
    commentOnDiscussion,
    deleteCommentOnDiscussion,
    reactToDiscussion,

    // Knowledge Store
    knowledge,
    fetchKnowledge,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    commentOnKnowledge,
    deleteCommentOnKnowledge,

    // Brainstorm Store
    ideas,
    fetchIdeas,
    createIdea,
    updateIdea,
    deleteIdea,
    voteIdea,
    commentOnIdea,
    deleteCommentOnIdea,

    // Meetings Store
    meetings,
    fetchMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    commentOnMeeting,
    deleteCommentOnMeeting,
    generateMinutes,

    // Analytics & Invites Store
    leaderboard,
    activities,
    inviteLinks,
    fetchAnalytics,
    fetchActivities,
    fetchInviteLinks,
    generateInvite,
    revokeInvite,
    inviteMember,
    updateMemberRole,
    removeMember,
    joinPublicWorkspace,
    askAssistant,
  } = useWorkspacesStore();

  const [activeAccent, setActiveAccent] = useState(THEME_ACCENTS.purple);
  const [activeBtn, setActiveBtn] = useState(THEME_BUTTONS.purple);

  // Comments feed state
  const [commentText, setCommentText] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<string>("");

  // Sub-module modal forms
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitleInput, setNoteTitleInput] = useState("");
  const [noteContentInput, setNoteContentInput] = useState("");
  const [noteCategoryInput, setNoteCategoryInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  // Kanban Tasks forms
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskStatus, setTaskStatus] = useState("To Do");
  const [taskAssignee, setTaskAssignee] = useState<number | null>(null);
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [taskTagInput, setTaskTagInput] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Goals forms
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalMilestones, setGoalMilestones] = useState<{ name: string; completed: boolean }[]>([]);
  const [milestoneInput, setMilestoneInput] = useState("");

  // Calendar forms
  const [eventOpen, setEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventType, setEventType] = useState("Meeting");
  const [eventDate, setEventDate] = useState("");
  const [conflictReport, setConflictReport] = useState("");

  // Discussions forms
  const [discOpen, setDiscOpen] = useState(false);
  const [discTitle, setDiscTitle] = useState("");
  const [discContent, setDiscContent] = useState("");
  const [discCategory, setDiscCategory] = useState("General");

  // Knowledge forms
  const [knowOpen, setKnowOpen] = useState(false);
  const [knowTitle, setKnowTitle] = useState("");
  const [knowContent, setKnowContent] = useState("");
  const [knowCategory, setKnowCategory] = useState("Documentation");
  const [organizeReport, setOrganizeReport] = useState("");

  // Brainstorm forms
  const [ideaOpen, setIdeaOpen] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaContent, setIdeaContent] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Feature Idea");
  const [clusterReport, setClusterReport] = useState("");

  // Meetings forms
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetTitle, setMeetTitle] = useState("");
  const [meetDate, setMeetDate] = useState("");
  const [meetAgenda, setMeetAgenda] = useState("");
  const [meetNotes, setMeetNotes] = useState("");
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [meetingForMinutes, setMeetingForMinutes] = useState<any>(null);

  // AI Assistant state
  const [aiInput, setAiInput] = useState("");
  const [aiChat, setAiChat] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hello! I am your Workspace AI Assistant. I can answer questions about notes, wiki logs, plans, and events in this workspace. How can I help?" }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  useEffect(() => {
    if (workspaceId) {
      fetchWorkspace(workspaceId);
    }
  }, [workspaceId, fetchWorkspace]);

  useEffect(() => {
    if (activeWorkspace) {
      const themeName = activeWorkspace.theme || "purple";
      setActiveAccent(THEME_ACCENTS[themeName] || THEME_ACCENTS.purple);
      setActiveBtn(THEME_BUTTONS[themeName] || THEME_BUTTONS.purple);
      loadModuleData(activeModule);
    }
  }, [activeWorkspace, activeModule]);

  const loadModuleData = (mod: string) => {
    if (!workspaceId) return;
    if (mod === "ai") {
      setActiveModule("notes");
      return;
    }
    if (mod === "notes") fetchNotes(workspaceId);
    if (mod === "tasks") {
      fetchTasks(workspaceId);
    }
    if (mod === "goals") fetchGoals(workspaceId);
    if (mod === "calendar") fetchEvents(workspaceId);
    if (mod === "discussions") fetchDiscussions(workspaceId);
    if (mod === "knowledge") fetchKnowledge(workspaceId);
    if (mod === "brainstorm") fetchIdeas(workspaceId);
    if (mod === "meetings") fetchMeetings(workspaceId);
    if (mod === "analytics") fetchAnalytics(workspaceId);
    if (mod === "settings") {
      fetchActivities(workspaceId);
      fetchInviteLinks(workspaceId);
    }
  };

  const memberObj = activeWorkspace?.members?.find(m => m.user_id === currentUser?.id);
  const currentUserRole = memberObj ? memberObj.role : "Viewer";
  const isGuest = !memberObj;

  const canEditOrDelete = (item: any) => {
    if (!item) return false;
    if (currentUserRole === "Viewer") return false;
    if (currentUserRole === "Owner" || currentUserRole === "Admin") return true;
    const creatorId = item.creator_id ?? item.user_id ?? item.organizer_id;
    return creatorId === currentUser?.id;
  };

  const handleJoin = async () => {
    try {
      await joinPublicWorkspace(workspaceId);
      toast.success("Successfully joined the workspace!");
      fetchWorkspace(workspaceId);
    } catch (e) {
      toast.error("Failed to join workspace");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (confirm("Are you sure you want to delete this entire workspace? This cannot be undone.")) {
      try {
        await deleteWorkspace(workspaceId);
        toast.success("Workspace deleted successfully");
        router.push("/workspaces");
      } catch (e) {
        toast.error("Failed to delete workspace");
      }
    }
  };

  // Comments feed helper
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedItem) return;

    try {
      if (selectedItemType === "note") {
        await commentOnNote(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "task") {
        await commentOnTask(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "goal") {
        await commentOnGoal(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "event") {
        await commentOnEvent(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "discussion") {
        await commentOnDiscussion(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "knowledge") {
        await commentOnKnowledge(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "idea") {
        await commentOnIdea(workspaceId, selectedItem.id, commentText.trim());
      } else if (selectedItemType === "meeting") {
        await commentOnMeeting(workspaceId, selectedItem.id, commentText.trim());
      }
      setCommentText("");
      // Refresh current item reference
      refreshSelectedItem();
      toast.success("Comment added!");
    } catch (e) {
      toast.error("Failed to add comment");
    }
  };

  const handleCommentDelete = async (commentId: string | number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      if (selectedItemType === "note") {
        await deleteCommentOnNote(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "task") {
        await deleteCommentOnTask(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "goal") {
        await deleteCommentOnGoal(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "event") {
        await deleteCommentOnEvent(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "discussion") {
        await deleteCommentOnDiscussion(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "knowledge") {
        await deleteCommentOnKnowledge(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "idea") {
        await deleteCommentOnIdea(workspaceId, selectedItem.id, commentId);
      } else if (selectedItemType === "meeting") {
        await deleteCommentOnMeeting(workspaceId, selectedItem.id, commentId);
      }
      refreshSelectedItem();
      toast.success("Comment deleted");
    } catch (e) {
      toast.error("Failed to delete comment");
    }
  };

  const refreshSelectedItem = () => {
    if (!selectedItem) return;
    let fresh = null;
    if (selectedItemType === "note") fresh = notes.find(n => n.id === selectedItem.id);
    else if (selectedItemType === "task") fresh = tasks.find(t => t.id === selectedItem.id);
    else if (selectedItemType === "goal") fresh = goals.find(g => g.id === selectedItem.id);
    else if (selectedItemType === "event") fresh = events.find(e => e.id === selectedItem.id);
    else if (selectedItemType === "discussion") fresh = discussions.find(d => d.id === selectedItem.id);
    else if (selectedItemType === "knowledge") fresh = knowledge.find(k => k.id === selectedItem.id);
    else if (selectedItemType === "idea") fresh = ideas.find(i => i.id === selectedItem.id);
    else if (selectedItemType === "meeting") fresh = meetings.find(m => m.id === selectedItem.id);
    if (fresh) setSelectedItem(fresh);
  };

  // Notes sub-module handlers
  const handleSaveNote = async () => {
    if (!noteTitleInput.trim() || !noteContentInput.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      if (editingNoteId) {
        await updateNote(workspaceId, editingNoteId, {
          title: noteTitleInput.trim(),
          content: noteContentInput.trim(),
          category: noteCategoryInput.trim() || null
        });
        toast.success("Note updated");
      } else {
        await createNote(workspaceId, noteTitleInput.trim(), noteContentInput.trim(), noteCategoryInput.trim() || undefined);
        toast.success("Note created");
      }
      setNoteOpen(false);
      resetNoteForm();
    } catch (e) {
      toast.error("Failed to save note");
    }
  };

  const resetNoteForm = () => {
    setNoteTitleInput("");
    setNoteContentInput("");
    setNoteCategoryInput("");
    setEditingNoteId(null);
  };

  // Kanban Tasks handlers
  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Task title is required");
      return;
    }
    try {
      const payload = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        status: taskStatus,
        due_date: taskDueDate || undefined,
        assignee_id: taskAssignee || undefined,
        tags: taskTags,
      };

      if (editingTaskId) {
        await updateTask(workspaceId, editingTaskId, payload);
        toast.success("Task updated");
      } else {
        await createTask(workspaceId, payload);
        toast.success("Task created");
      }
      setTaskOpen(false);
      resetTaskForm();
    } catch (e) {
      toast.error("Failed to save task");
    }
  };

  const resetTaskForm = () => {
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("Medium");
    setTaskStatus("To Do");
    setTaskAssignee(null);
    setTaskDueDate("");
    setTaskTags([]);
    setEditingTaskId(null);
  };

  // Goals handlers
  const handleSaveGoal = async () => {
    if (!goalTitle.trim()) {
      toast.error("Goal title is required");
      return;
    }
    try {
      await createGoal(workspaceId, goalTitle.trim(), goalMilestones);
      toast.success("Goal created");
      setGoalOpen(false);
      setGoalTitle("");
      setGoalMilestones([]);
    } catch (e) {
      toast.error("Failed to create goal");
    }
  };

  const addMilestone = () => {
    if (!milestoneInput.trim()) return;
    setGoalMilestones([...goalMilestones, { name: milestoneInput.trim(), completed: false }]);
    setMilestoneInput("");
  };

  // Calendar handlers
  const handleSaveEvent = async () => {
    if (!eventTitle.trim() || !eventDate) {
      toast.error("Title and date are required");
      return;
    }
    try {
      await createEvent(workspaceId, {
        title: eventTitle.trim(),
        description: eventDesc.trim() || undefined,
        type: eventType,
        date: eventDate
      });
      toast.success("Event scheduled");
      setEventOpen(false);
      setEventTitle("");
      setEventDesc("");
      setEventDate("");
    } catch (e) {
      toast.error("Failed to save event");
    }
  };

  const handleConflictCheck = async () => {
    try {
      const res = await useWorkspacesStore.getState().askAssistant(workspaceId, "Run event conflicts check report.");
      setConflictReport(res || "No scheduled conflicts detected.");
    } catch (e) {
      toast.error("Failed to run conflicts check");
    }
  };

  // Discussions handlers
  const handleSaveDiscussion = async () => {
    if (!discTitle.trim() || !discContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      await createDiscussion(workspaceId, discTitle.trim(), discContent.trim(), discCategory || undefined);
      toast.success("Topic posted");
      setDiscOpen(false);
      setDiscTitle("");
      setDiscContent("");
    } catch (e) {
      toast.error("Failed to post discussion");
    }
  };

  // Knowledge Wiki handlers
  const handleSaveKnowledge = async () => {
    if (!knowTitle.trim() || !knowContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    try {
      await createKnowledge(workspaceId, knowTitle.trim(), knowContent.trim(), knowCategory || undefined);
      toast.success("Knowledge wiki added");
      setKnowOpen(false);
      setKnowTitle("");
      setKnowContent("");
    } catch (e) {
      toast.error("Failed to add knowledge wiki");
    }
  };

  const handleOrganizeKnowledge = async () => {
    try {
      const res = await useWorkspacesStore.getState().askAssistant(workspaceId, "Please outline and organize our knowledge base categories into a structured tree layout.");
      setOrganizeReport(res);
    } catch (e) {
      toast.error("Failed to auto organize wiki content");
    }
  };

  // Brainstorm Board handlers
  const handleSaveIdea = async () => {
    if (!ideaTitle.trim() || !ideaContent.trim()) {
      toast.error("Title and description are required");
      return;
    }
    try {
      await createIdea(workspaceId, ideaTitle.trim(), ideaContent.trim(), ideaCategory || undefined);
      toast.success("Brainstorm idea pinned");
      setIdeaOpen(false);
      setIdeaTitle("");
      setIdeaContent("");
    } catch (e) {
      toast.error("Failed to pin idea");
    }
  };

  const handleClusterIdeas = async () => {
    try {
      const res = await useWorkspacesStore.getState().askAssistant(workspaceId, "Summarize and group all brainstorm board ideas into clusters of distinct topics.");
      setClusterReport(res);
    } catch (e) {
      toast.error("Failed to cluster brainstorm ideas");
    }
  };

  // Meetings Center handlers
  const handleSaveMeeting = async () => {
    if (!meetTitle.trim() || !meetDate) {
      toast.error("Title and date are required");
      return;
    }
    try {
      await createMeeting(workspaceId, {
        title: meetTitle.trim(),
        date: meetDate,
        agenda: meetAgenda.trim() || undefined
      });
      toast.success("Meeting scheduled");
      setMeetOpen(false);
      setMeetTitle("");
      setMeetDate("");
      setMeetAgenda("");
    } catch (e) {
      toast.error("Failed to schedule meeting");
    }
  };

  const handleGenerateMinutes = async () => {
    if (!meetNotes.trim() || !meetingForMinutes) return;
    try {
      toast.info("Generating meeting minutes using AI...");
      await generateMinutes(workspaceId, meetingForMinutes.id, meetNotes);
      toast.success("Meeting minutes generated!");
      setMinutesOpen(false);
      setMeetNotes("");
      setMeetingForMinutes(null);
      fetchMeetings(workspaceId);
    } catch (e) {
      toast.error("Failed to generate minutes");
    }
  };

  // AI Assistant handlers
  const handleAiSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    const userMessage = aiInput.trim();
    setAiChat(prev => [...prev, { role: "user", content: userMessage }]);
    setAiInput("");
    setAiLoading(true);

    try {
      const assistantResponse = await askAssistant(workspaceId, userMessage);
      setAiChat(prev => [...prev, { role: "assistant", content: assistantResponse }]);
    } catch (e) {
      setAiChat(prev => [...prev, { role: "assistant", content: "Error: I couldn't reach the AI assistant. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Invite member handlers
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      await inviteMember(workspaceId, inviteEmail.trim(), inviteRole);
      toast.success(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
      fetchWorkspace(workspaceId);
    } catch (error: any) {
      const errMsg = error?.response?.data?.detail || "Failed to invite member";
      toast.error(errMsg);
    }
  };

  const handleRoleChange = async (memberId: number, role: string) => {
    try {
      await updateMemberRole(workspaceId, memberId, role);
      toast.success("Role updated");
    } catch (e) {
      toast.error("Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await removeMember(workspaceId, memberId);
      toast.success("Member removed");
    } catch (e) {
      toast.error("Failed to remove member");
    }
  };

  const handleCreateInviteCode = async () => {
    try {
      await generateInvite(workspaceId);
      toast.success("Invite code generated!");
    } catch (e) {
      toast.error("Failed to generate invite code");
    }
  };

  if (isLoading && !activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-6rem)]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] text-center text-muted-foreground">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h3 className="text-xl font-bold text-foreground mb-2">Workspace Not Found</h3>
        <p className="max-w-xs mb-4">The workspace you are trying to view does not exist or you do not have permission.</p>
        <Button onClick={() => router.push("/workspaces")}>Back to Workspaces</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6rem)] overflow-hidden">
      
      {/* Workspace Sidebar - Modules navigation */}
      <div className="w-full lg:w-60 shrink-0 bg-card/40 border border-border/80 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto max-h-[30vh] lg:max-h-none">
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${activeAccent}`}>
              {activeWorkspace.icon || "👥"}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground truncate">{activeWorkspace.name}</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{activeWorkspace.category}</span>
            </div>
          </div>

          <nav className="space-y-1">
            {MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              
              return (
                <button
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod.id);
                    setSelectedItem(null);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
                    isActive 
                      ? activeAccent 
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {isGuest && (
          <Button onClick={handleJoin} className={`w-full mt-4 ${activeBtn} text-white`}>
            Join Workspace
          </Button>
        )}
      </div>

      {/* Workspace Active Panel */}
      <div className="flex-1 bg-card/20 border border-border/60 rounded-2xl flex flex-col overflow-hidden relative">
        
        {/* Module Header */}
        <div className="shrink-0 p-4 border-b border-border/40 flex items-center justify-between bg-card/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {MODULES.find(m => m.id === activeModule)?.label && (
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                {activeModule === "notes" && "📝 Workspace Notes"}
                {activeModule === "tasks" && "📋 Task Kanban Board"}
                {activeModule === "goals" && "🎯 Shared Milestones"}
                {activeModule === "calendar" && "📅 Event Calendar"}
                {activeModule === "discussions" && "💬 Discussion Board"}
                {activeModule === "knowledge" && "📚 Knowledge Base"}
                {activeModule === "brainstorm" && "💡 Brainstorm Wall"}
                {activeModule === "meetings" && "👥 Meeting Logs"}
                {activeModule === "ai" && "✨ AI Copilot"}
                {activeModule === "analytics" && "🏆 Productivity Leaderboard"}
                {activeModule === "settings" && "⚙️ Workspace Settings"}
              </h2>
            )}
          </div>
          
          {/* Action buttons based on modules */}
          <div>
            {!isGuest && currentUserRole !== "Viewer" && (
              <>
                {activeModule === "notes" && (
                  <Button size="sm" onClick={() => { resetNoteForm(); setNoteOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Add Note
                  </Button>
                )}
                {activeModule === "tasks" && (
                  <Button size="sm" onClick={() => { resetTaskForm(); setTaskOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Create Task
                  </Button>
                )}
                {activeModule === "goals" && (
                  <Button size="sm" onClick={() => { setGoalOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Add Goal
                  </Button>
                )}
                {activeModule === "calendar" && (
                  <Button size="sm" onClick={() => { setEventOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Schedule Event
                  </Button>
                )}
                {activeModule === "discussions" && (
                  <Button size="sm" onClick={() => { setDiscOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Post Topic
                  </Button>
                )}
                {activeModule === "knowledge" && (
                  <Button size="sm" onClick={() => { setKnowOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Add Article
                  </Button>
                )}
                {activeModule === "brainstorm" && (
                  <Button size="sm" onClick={() => { setIdeaOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Pin Idea
                  </Button>
                )}
                {activeModule === "meetings" && (
                  <Button size="sm" onClick={() => { setMeetOpen(true); }} className={activeBtn + " text-white"}>
                    <Plus className="w-4 h-4 mr-1" /> Schedule Meeting
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Module Content Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          
          {/* Notes View */}
          {activeModule === "notes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-card border border-border/80 rounded-xl p-4 flex flex-col justify-between hover:border-primary/50 transition-colors">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-foreground text-base line-clamp-1">{note.title}</h4>
                      {note.category && (
                        <span className="text-[10px] bg-accent border px-2 py-0.5 rounded-full text-muted-foreground shrink-0">
                          {note.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{note.content}</p>
                    
                    {note.ai_summary && (
                      <div className="mt-3 bg-purple-500/5 border border-purple-500/10 rounded-lg p-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> AI Summary
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">{note.ai_summary}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                    <span>By {note.author_name || "Member"}</span>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={async () => {
                          try {
                            if (note.ai_summary) {
                              await deleteNoteSummary(workspaceId, note.id);
                              toast.success("AI Summary removed");
                            } else {
                              toast.info("Generating AI Summary...");
                              await summarizeNote(workspaceId, note.id);
                              toast.success("AI Summary created!");
                            }
                          } catch (e) {
                            toast.error("AI summarization failed");
                          }
                        }}
                      >
                        <Sparkle className={`w-3.5 h-3.5 ${note.ai_summary ? "text-purple-400 fill-purple-400" : ""}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => {
                          setSelectedItem(note);
                          setSelectedItemType("note");
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                      {canEditOrDelete(note) && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-primary"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setNoteTitleInput(note.title);
                              setNoteContentInput(note.content);
                              setNoteCategoryInput(note.category || "");
                              setNoteOpen(true);
                            }}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              if (confirm("Delete this note?")) {
                                try {
                                  await deleteNote(workspaceId, note.id);
                                  toast.success("Note deleted");
                                } catch (e) {
                                  toast.error("Failed to delete note");
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Kanban Tasks View */}
          {activeModule === "tasks" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-h-[450px]">
              {["To Do", "In Progress", "Review", "Completed"].map((col) => {
                const colTasks = tasks.filter(t => t.status === col);
                return (
                  <div key={col} className="bg-card/40 border border-border/40 rounded-xl p-3 flex flex-col min-h-[300px]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm text-foreground">{col}</span>
                      <span className="text-xs bg-accent border px-2 py-0.5 rounded-full text-muted-foreground">{colTasks.length}</span>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {colTasks.map((task) => (
                        <div key={task.id} className="bg-card border border-border rounded-lg p-3 space-y-2 hover:border-primary/50 transition-colors">
                          <div className="flex justify-between items-start gap-1">
                            <h5 className="font-bold text-sm text-foreground line-clamp-1">{task.title}</h5>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-bold shrink-0 ${
                              task.priority === "High" 
                                ? "bg-red-500/10 text-red-400 border-red-500/20" 
                                : task.priority === "Medium"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            }`}>
                              {task.priority}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description || "No description."}</p>

                          {task.subtasks?.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Subtasks</span>
                                <span>
                                  {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                                </span>
                              </div>
                              <div className="w-full bg-accent rounded-full h-1">
                                <div 
                                  className="bg-primary h-1 rounded-full" 
                                  style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                            <span>Assignee: {task.assignee_name || "Unassigned"}</span>
                            <div className="flex gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="w-6 h-6"
                                onClick={() => {
                                  setSelectedItem(task);
                                  setSelectedItemType("task");
                                }}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </Button>
                              <select
                                value={task.status}
                                onChange={async (e) => {
                                  try {
                                    await updateTask(workspaceId, task.id, { status: e.target.value });
                                    toast.success("Status updated");
                                  } catch (e) {
                                    toast.error("Failed to update status");
                                  }
                                }}
                                className="bg-card border border-border text-foreground text-[9px] rounded px-1 focus:outline-none"
                              >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Review">Review</option>
                                <option value="Completed">Completed</option>
                              </select>
                              {canEditOrDelete(task) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="w-6 h-6 text-destructive"
                                  onClick={async () => {
                                    if (confirm("Delete this task?")) {
                                      try {
                                        await deleteTask(workspaceId, task.id);
                                        toast.success("Task deleted");
                                      } catch (e) {
                                        toast.error("Failed to delete task");
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Goals View */}
          {activeModule === "goals" && (
            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="bg-card border border-border/80 rounded-xl p-5 space-y-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-foreground text-lg">{goal.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">Created by {goal.creator_name || "Member"}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(goal);
                          setSelectedItemType("goal");
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> Discussion
                      </Button>
                      {canEditOrDelete(goal) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            if (confirm("Delete this goal?")) {
                              try {
                                await deleteGoal(workspaceId, goal.id);
                                toast.success("Goal deleted");
                              } catch (e) {
                                toast.error("Failed to delete goal");
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {goal.milestones?.length > 0 && (
                    <div className="space-y-3 bg-accent/40 border border-border/40 rounded-xl p-4">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Milestones Checklist</span>
                        <span className="text-primary font-bold">
                          {Math.round((goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100)}% Complete
                        </span>
                      </div>

                      <div className="w-full bg-accent rounded-full h-1.5">
                        <div 
                          className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${(goal.milestones.filter(m => m.completed).length / goal.milestones.length) * 100}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {goal.milestones.map((m, idx) => (
                          <div 
                            key={idx} 
                            onClick={async () => {
                              const updatedMilestones = goal.milestones.map((ms, i) => i === idx ? { ...ms, completed: !ms.completed } : ms);
                              const progressPercent = Math.round((updatedMilestones.filter(ms => ms.completed).length / updatedMilestones.length) * 100);
                              try {
                                await updateGoal(workspaceId, goal.id, {
                                  milestones: updatedMilestones,
                                  progress: progressPercent
                                });
                                toast.success("Milestone updated");
                              } catch (e) {
                                toast.error("Failed to update milestone");
                              }
                            }}
                            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                              m.completed 
                                ? "bg-primary/5 border-primary/20 text-muted-foreground" 
                                : "bg-card border-border hover:border-primary/40 text-foreground"
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                              m.completed ? "bg-primary border-primary text-primary-foreground" : "border-border"
                            }`}>
                              {m.completed && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-sm font-medium">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Calendar View */}
          {activeModule === "calendar" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((ev) => (
                  <div key={ev.id} className="bg-card border border-border/80 rounded-xl p-4 flex justify-between hover:border-primary/50 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          ev.type === "Meeting" 
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : ev.type === "Deadline"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}>
                          {ev.type || "Event"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(ev.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-base">{ev.title}</h4>
                      <p className="text-sm text-muted-foreground">{ev.description || "No description."}</p>
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0 pl-4">
                      <span className="text-[10px] text-muted-foreground">By {ev.creator_name || "Member"}</span>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => {
                            setSelectedItem(ev);
                            setSelectedItemType("event");
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                        {canEditOrDelete(ev) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive"
                            onClick={async () => {
                              if (confirm("Delete this event?")) {
                                try {
                                  await deleteEvent(workspaceId, ev.id);
                                  toast.success("Event deleted");
                                } catch (e) {
                                  toast.error("Failed to delete event");
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discussions View */}
          {activeModule === "discussions" && (
            <div className="space-y-4">
              {discussions.map((disc) => (
                <div key={disc.id} className="bg-card border border-border/80 rounded-xl p-5 space-y-3 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        {disc.category}
                      </span>
                      <h4 className="font-bold text-foreground text-lg pt-1">{disc.title}</h4>
                      <p className="text-xs text-muted-foreground">Posted by {disc.author_name || "Member"} • {new Date(disc.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(disc);
                          setSelectedItemType("discussion");
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> {disc.comments?.length || 0} Replies
                      </Button>
                      {canEditOrDelete(disc) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive"
                          onClick={async () => {
                            if (confirm("Delete this topic?")) {
                              try {
                                await deleteDiscussion(workspaceId, disc.id);
                                toast.success("Discussion deleted");
                              } catch (e) {
                                toast.error("Failed to delete topic");
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{disc.content}</p>

                  <div className="flex gap-3 pt-3 border-t border-border/40">
                    {["🔥", "👍", "💡", "👀"].map((emoji) => {
                      const voters = disc.reactions?.[emoji] || [];
                      const hasVoted = voters.includes(currentUser?.id || 0);

                      return (
                        <button
                          key={emoji}
                          onClick={async () => {
                            try {
                              await reactToDiscussion(workspaceId, disc.id, emoji);
                              loadModuleData("discussions");
                            } catch (e) {
                              toast.error("Failed to react");
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
                            hasVoted 
                              ? "bg-primary/20 border-primary text-foreground" 
                              : "bg-card border-border hover:bg-accent"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{voters.length}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Knowledge base wiki View */}
          {activeModule === "knowledge" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {knowledge.map((know) => (
                  <div key={know.id} className="bg-card border border-border/80 rounded-xl p-5 space-y-3 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          {know.category}
                        </span>
                        <h4 className="font-bold text-foreground text-lg pt-1">{know.title}</h4>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => {
                            setSelectedItem(know);
                            setSelectedItemType("knowledge");
                          }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                        {canEditOrDelete(know) && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-destructive"
                            onClick={async () => {
                              if (confirm("Delete this wiki article?")) {
                                try {
                                  await deleteKnowledge(workspaceId, know.id);
                                  toast.success("Knowledge wiki deleted");
                                } catch (e) {
                                  toast.error("Failed to delete article");
                                }
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{know.content}</p>
                    <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/40">
                      Authored by {know.author_name || "Member"} • {new Date(know.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Brainstorm Board View */}
          {activeModule === "brainstorm" && (
            <div className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {ideas.map((idea) => {
                  const hasVoted = (idea.votes || []).includes(currentUser?.id || 0);

                  return (
                    <div key={idea.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 flex flex-col justify-between h-[200px] hover:border-yellow-500/50 transition-colors">
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                            {idea.category}
                          </span>
                          {canEditOrDelete(idea) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="w-6 h-6 text-destructive"
                              onClick={async () => {
                                if (confirm("Delete this idea?")) {
                                  try {
                                    await deleteIdea(workspaceId, idea.id);
                                    toast.success("Idea removed");
                                  } catch (e) {
                                    toast.error("Failed to delete idea");
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>

                        <h4 className="font-bold text-foreground mt-2 line-clamp-1">{idea.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{idea.content}</p>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-border/40 mt-4 text-[10px] text-muted-foreground">
                        <span>By {idea.author_name || "Member"}</span>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => {
                              setSelectedItem(idea);
                              setSelectedItemType("idea");
                            }}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await voteIdea(workspaceId, idea.id);
                                loadModuleData("brainstorm");
                              } catch (e) {
                                toast.error("Failed to vote");
                              }
                            }}
                            className={`h-7 px-2 flex items-center gap-1 ${
                              hasVoted ? "bg-primary/20 border-primary text-foreground" : "border-border"
                            }`}
                          >
                            <Vote className="w-3.5 h-3.5" />
                            <span>{(idea.votes || []).length}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Meetings Center View */}
          {activeModule === "meetings" && (
            <div className="space-y-4">
              {meetings.map((meet) => (
                <div key={meet.id} className="bg-card border border-border/80 rounded-xl p-5 space-y-4 hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-accent border px-2 py-0.5 rounded-full text-muted-foreground font-semibold">
                          Organizer: {meet.organizer_name || "Member"}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(meet.date).toLocaleString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-foreground text-lg pt-1">{meet.title}</h4>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMeetingForMinutes(meet);
                          setMeetNotes(meet.decisions || "");
                          setMinutesOpen(true);
                        }}
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-400" /> AI Minutes Writer
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7"
                        onClick={() => {
                          setSelectedItem(meet);
                          setSelectedItemType("meeting");
                        }}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </Button>
                      {canEditOrDelete(meet) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-destructive"
                          onClick={async () => {
                            if (confirm("Delete this scheduled meeting?")) {
                              try {
                                await deleteMeeting(workspaceId, meet.id);
                                toast.success("Meeting deleted");
                              } catch (e) {
                                toast.error("Failed to delete meeting");
                              }
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {meet.agenda && (
                    <div className="text-sm text-muted-foreground">
                      <strong className="text-foreground font-semibold">Agenda:</strong>
                      <p className="mt-1 whitespace-pre-wrap">{meet.agenda}</p>
                    </div>
                  )}

                  {meet.summary && (
                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> AI Generated Summary & Minutes
                      </span>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {meet.summary}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AI Assistant View */}
          {activeModule === "ai" && (
            <div className="flex flex-col h-[450px] border border-border/60 rounded-xl overflow-hidden bg-card/40">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiChat.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl p-3 text-sm whitespace-pre-wrap ${
                      msg.role === "user" 
                        ? activeAccent + " border border-primary/20 text-foreground" 
                        : "bg-accent/40 text-foreground"
                    }`}>
                      {msg.role === "assistant" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                          ✨ Assistant
                        </span>
                      )}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-accent/40 rounded-2xl p-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      Querying workspace index...
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleAiSend} className="p-3 border-t border-border/40 bg-card flex gap-2">
                <Input
                  placeholder="Ask a question about project documents or events..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  className="flex-1 bg-accent border-border"
                  disabled={aiLoading}
                />
                <Button type="submit" disabled={aiLoading} className={activeBtn + " text-white"}>
                  Send
                </Button>
              </form>
            </div>
          )}

          {/* Leaderboard Analytics View */}
          {activeModule === "analytics" && leaderboard && (
            <div className="space-y-6">
              {/* Top Champions Widgets */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card border border-border/80 rounded-xl p-5 flex items-center gap-4 hover:border-yellow-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 text-2xl shrink-0">
                    🏆
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">Top Contributor</span>
                    <h4 className="font-bold text-foreground text-base mt-0.5">{leaderboard.top_contributor?.user_name || "None"}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Score: {leaderboard.top_contributor?.contribution_score || 0}</p>
                  </div>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-5 flex items-center gap-4 hover:border-purple-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 text-2xl shrink-0">
                    ⚡
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Most Productive</span>
                    <h4 className="font-bold text-foreground text-base mt-0.5">{leaderboard.most_productive?.user_name || "None"}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{leaderboard.most_productive?.tasks_completed || 0} Tasks Done</p>
                  </div>
                </div>

                <div className="bg-card border border-border/80 rounded-xl p-5 flex items-center gap-4 hover:border-blue-500/40 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl shrink-0">
                    📖
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Knowledge Champion</span>
                    <h4 className="font-bold text-foreground text-base mt-0.5">{leaderboard.knowledge_champion?.user_name || "None"}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{leaderboard.knowledge_champion?.notes_created || 0} Wiki Docs</p>
                  </div>
                </div>
              </div>

              {/* Members Stats Grid */}
              <div className="bg-card border border-border/80 rounded-xl p-5">
                <h4 className="font-bold text-foreground text-base mb-4">Member Activity Rankings</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-xs uppercase">
                        <th className="py-2.5">Member</th>
                        <th className="py-2.5 text-center">Tasks Done</th>
                        <th className="py-2.5 text-center">Goals Met</th>
                        <th className="py-2.5 text-center">Wiki Docs</th>
                        <th className="py-2.5 text-center">Participation %</th>
                        <th className="py-2.5 text-right">Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.members?.map((member, index) => (
                        <tr key={index} className="border-b border-border/20 hover:bg-accent/10 transition-colors">
                          <td className="py-3 font-semibold text-foreground">{member.user_name}</td>
                          <td className="py-3 text-center text-muted-foreground">{member.tasks_completed}</td>
                          <td className="py-3 text-center text-muted-foreground">{member.goals_achieved}</td>
                          <td className="py-3 text-center text-muted-foreground">{member.notes_created}</td>
                          <td className="py-3 text-center text-muted-foreground">{member.participation_rate}%</td>
                          <td className="py-3 text-right font-bold text-primary">{member.contribution_score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings View */}
          {activeModule === "settings" && (
            <div className="space-y-6">
              
              {/* Workspace details modifier */}
              {(currentUserRole === "Owner" || currentUserRole === "Admin") && (
                <div className="bg-card border border-border/80 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-foreground text-base">Modify Workspace</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Workspace Name</label>
                      <Input
                        value={activeWorkspace.name}
                        onChange={async (e) => {
                          try {
                            await updateWorkspace(workspaceId, { name: e.target.value });
                          } catch (e) {}
                        }}
                        className="bg-accent border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Description</label>
                      <Input
                        value={activeWorkspace.description || ""}
                        onChange={async (e) => {
                          try {
                            await updateWorkspace(workspaceId, { description: e.target.value });
                          } catch (e) {}
                        }}
                        className="bg-accent border-border"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Members Management */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Members list */}
                <div className="md:col-span-2 bg-card border border-border/80 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-foreground text-base">Members List ({activeWorkspace.members?.length || 1})</h4>
                  
                  <div className="space-y-3">
                    {activeWorkspace.members?.map((m) => (
                      <div key={m.id} className="flex justify-between items-center p-3 bg-accent/40 border border-border/40 rounded-xl">
                        <div>
                          <p className="font-semibold text-foreground text-sm">{m.user_full_name || "Unknown Member"}</p>
                          <p className="text-xs text-muted-foreground">{m.user_email || "No email"}</p>
                        </div>

                        <div className="flex gap-2">
                          {(currentUserRole === "Owner" || currentUserRole === "Admin") && m.user_id !== currentUser?.id ? (
                            <>
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                className="bg-card border border-border text-foreground text-xs rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="Viewer">Viewer</option>
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 h-8"
                                onClick={() => handleRemoveMember(m.id)}
                              >
                                Remove
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs bg-accent border px-2 py-1 rounded-md text-muted-foreground">
                              {m.role}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invite & Invite links code creator */}
                <div className="bg-card border border-border/80 rounded-xl p-5 space-y-4 h-fit">
                  <h4 className="font-bold text-foreground text-base">Access & Invite Codes</h4>
                  
                  {(currentUserRole === "Owner" || currentUserRole === "Admin") ? (
                    <div className="space-y-4">
                      {activeWorkspace.privacy_level === "Invite Only" && (
                        <div className="space-y-3">
                          <Button size="sm" onClick={handleCreateInviteCode} className="w-full">
                            Generate Invite Link Code
                          </Button>

                          <div className="space-y-2">
                            {inviteLinks.map((invite) => (
                              <div key={invite.id} className="flex justify-between items-center p-2.5 bg-accent/60 border border-border/60 rounded-xl text-xs">
                                <span className="font-mono text-primary font-bold">{invite.invite_token}</span>
                                <div className="flex gap-1">
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="w-6 h-6"
                                    onClick={() => {
                                      navigator.clipboard.writeText(invite.invite_token);
                                      toast.success("Code copied!");
                                    }}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="w-6 h-6 text-destructive"
                                    onClick={async () => {
                                      try {
                                        await revokeInvite(workspaceId, invite.invite_token);
                                        toast.success("Invite revoked");
                                      } catch (e) {
                                        toast.error("Failed to revoke invite");
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <form onSubmit={handleInviteMember} className="space-y-3 pt-3 border-t border-border/40">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold">Invite via Email</label>
                          <Input
                            placeholder="collaborator@example.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="bg-accent border-border"
                            required
                          />
                        </div>
                        <Button type="submit" size="sm" className="w-full">
                          Send Invite Email
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Only owners and administrators can invite or manage access codes.</p>
                  )}
                </div>
              </div>

              {/* Delete Workspace option */}
              {currentUserRole === "Owner" && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-destructive text-base">Danger Zone</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Delete this workspace and all associated logs, notes, tasks permanently.</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleDeleteWorkspace}>
                    Delete Workspace
                  </Button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Comment Overlay Panel */}
        <AnimatePresence>
          {selectedItem && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="absolute top-0 right-0 w-full md:w-96 h-full bg-card border-l border-border shadow-2xl z-20 flex flex-col justify-between"
            >
              <div className="p-4 border-b border-border/40 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-foreground text-sm line-clamp-1">{selectedItem.title}</h4>
                  <span className="text-[10px] text-muted-foreground uppercase">Comments feed</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(selectedItem.comments || []).length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-10">No replies yet. Start the conversation!</p>
                ) : (
                  (selectedItem.comments || []).map((c: any) => (
                    <div key={c.id} className="bg-accent/40 border border-border/40 rounded-xl p-3 space-y-1 relative">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-foreground">{c.full_name || "Member"}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                          {(c.user_id === currentUser?.id || currentUserRole === "Owner" || currentUserRole === "Admin") && (
                            <button 
                              onClick={() => handleCommentDelete(c.id)}
                              className="text-destructive hover:text-destructive/80 text-[10px]"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleCommentSubmit} className="p-3 border-t border-border/40 bg-card flex gap-2">
                <Input
                  placeholder="Post a reply..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 bg-accent border-border text-xs"
                  required
                />
                <Button type="submit" size="sm" className={activeBtn + " text-white text-xs"}>
                  Reply
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Note modal dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Edit Note" : "Create Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Title</label>
              <Input
                placeholder="Topic summary..."
                value={noteTitleInput}
                onChange={(e) => setNoteTitleInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category Tag</label>
              <Input
                placeholder="e.g. Design, Brainstorm"
                value={noteCategoryInput}
                onChange={(e) => setNoteCategoryInput(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Content</label>
              <Textarea
                placeholder="Detailed contents here..."
                value={noteContentInput}
                onChange={(e) => setNoteContentInput(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setNoteOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveNote} className={activeBtn + " text-white"}>Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kanban Task Modal */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="bg-background border-border text-foreground max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTaskId ? "Edit Task" : "Create Kanban Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Task Title</label>
              <Input
                placeholder="Verify OAuth flows..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Description</label>
              <Textarea
                placeholder="Details of checklist scope..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="w-full bg-card border border-border text-foreground text-xs rounded-md h-9 px-2.5"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Assignee</label>
                <select
                  value={taskAssignee || ""}
                  onChange={(e) => setTaskAssignee(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full bg-card border border-border text-foreground text-xs rounded-md h-9 px-2.5"
                >
                  <option value="">Unassigned</option>
                  {activeWorkspace.members?.map(m => (
                    <option key={m.id} value={m.user_id}>
                      {m.user_full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Due Date</label>
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTask} className={activeBtn + " text-white"}>Save Task</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Modal */}
      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Goal Objective</label>
              <Input
                placeholder="Launch beta platform by end of month..."
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Milestones Checklist</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Finish database migrations"
                  value={milestoneInput}
                  onChange={(e) => setMilestoneInput(e.target.value)}
                />
                <Button size="sm" onClick={addMilestone}>Add</Button>
              </div>

              <div className="space-y-1.5 max-h-[150px] overflow-y-auto pt-1">
                {goalMilestones.map((ms, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-accent/40 px-2.5 py-1.5 border border-border/40 rounded-lg">
                    <span>{ms.name}</span>
                    <button 
                      type="button" 
                      onClick={() => setGoalMilestones(goalMilestones.filter((_, i) => i !== idx))}
                      className="text-destructive text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setGoalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveGoal} className={activeBtn + " text-white"}>Create Goal</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Schedule Modal */}
      <Dialog open={eventOpen} onOpenChange={setEventOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Schedule Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Title</label>
              <Input
                placeholder="Weekly review sync..."
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Description</label>
              <Input
                placeholder="Details or link meeting link..."
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full bg-card border border-border text-foreground text-xs rounded-md h-9 px-2.5"
                >
                  <option value="Meeting">Meeting</option>
                  <option value="Deadline">Deadline</option>
                  <option value="Sync">Sync</option>
                  <option value="Social">Social</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Date</label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setEventOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent} className={activeBtn + " text-white"}>Schedule</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Conflict Check Report Dialog */}
      <Dialog open={!!conflictReport} onOpenChange={() => setConflictReport("")}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Calendar Conflict Check Report</DialogTitle>
          </DialogHeader>
          <div className="bg-accent/40 border border-border p-3.5 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap max-h-[300px] overflow-y-auto">
            {conflictReport}
          </div>
          <DialogFooter>
            <Button onClick={() => setConflictReport("")}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discussion Dialog */}
      <Dialog open={discOpen} onOpenChange={setDiscOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Post Discussion Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Discussion Title</label>
              <Input
                placeholder="Feedback on frontend redesign..."
                value={discTitle}
                onChange={(e) => setDiscTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category</label>
              <select
                value={discCategory}
                onChange={(e) => setDiscCategory(e.target.value)}
                className="w-full bg-card border border-border text-foreground text-xs rounded-md h-9 px-2.5"
              >
                <option value="General">General</option>
                <option value="Q&A">Q&A</option>
                <option value="Ideation">Ideation</option>
                <option value="Announcements">Announcements</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Content</label>
              <Textarea
                placeholder="Write description or prompt details here..."
                value={discContent}
                onChange={(e) => setDiscContent(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDiscOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveDiscussion} className={activeBtn + " text-white"}>Post</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Knowledge wiki dialog */}
      <Dialog open={knowOpen} onOpenChange={setKnowOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Add wiki article</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Article Title</label>
              <Input
                placeholder="Product deployment playbook..."
                value={knowTitle}
                onChange={(e) => setKnowTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category</label>
              <Input
                placeholder="e.g. Playbook, Infrastructure"
                value={knowCategory}
                onChange={(e) => setKnowCategory(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Content</label>
              <Textarea
                placeholder="Write documentation text here..."
                value={knowContent}
                onChange={(e) => setKnowContent(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setKnowOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveKnowledge} className={activeBtn + " text-white"}>Add</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Brainstorm Dialog */}
      <Dialog open={ideaOpen} onOpenChange={setIdeaOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Pin Idea to Brainstorm Wall</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Idea Concept</label>
              <Input
                placeholder="Implement speech recognition voice notes..."
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Category Tag</label>
              <Input
                placeholder="e.g. Feature Idea, Growth"
                value={ideaCategory}
                onChange={(e) => setIdeaCategory(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Content</label>
              <Textarea
                placeholder="Elaborate on the idea concept details..."
                value={ideaContent}
                onChange={(e) => setIdeaContent(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIdeaOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveIdea} className={activeBtn + " text-white"}>Pin Idea</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetOpen} onOpenChange={setMeetOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Meeting Title</label>
              <Input
                placeholder="Sprint Retrospective..."
                value={meetTitle}
                onChange={(e) => setMeetTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Date & Time</label>
              <Input
                type="datetime-local"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold">Agenda</label>
              <Textarea
                placeholder="Items to address and discuss..."
                value={meetAgenda}
                onChange={(e) => setMeetAgenda(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setMeetOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveMeeting} className={activeBtn + " text-white"}>Schedule</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Minutes Creator Dialog */}
      <Dialog open={minutesOpen} onOpenChange={setMinutesOpen}>
        <DialogContent className="bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle>AI Meeting Minutes Generator</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Paste your raw notes taken during the meeting, and KnoVault AI will synthesize bulleted decisions and action items.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Raw Notes / Transcript</label>
              <Textarea
                placeholder="e.g. John discussed migration plans. Sarah approved the mockup design, target deadline is 15th..."
                value={meetNotes}
                onChange={(e) => setMeetNotes(e.target.value)}
                className="min-h-[150px]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setMinutesOpen(false); setMeetingForMinutes(null); setMeetNotes(""); }}>
                Cancel
              </Button>
              <Button onClick={handleGenerateMinutes} className={activeBtn + " text-white"}>
                Generate Minutes
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
