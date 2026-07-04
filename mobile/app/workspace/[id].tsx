import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/hooks/useTheme';
import {
  scheduleWorkspaceMeetingNotifications,
  cancelWorkspaceMeetingNotifications,
  scheduleWorkspaceEventNotifications,
  cancelWorkspaceEventNotifications,
  syncWorkspaceNotifications,
} from '../../src/utils/localNotifications';
import { useAuthStore } from '../../src/store/authStore';
import {
  workspacesApi,
  Workspace,
  WorkspaceNote,
  WorkspaceTask,
  WorkspaceGoal,
  WorkspaceEvent,
  WorkspaceDiscussion,
  WorkspaceKnowledge,
  WorkspaceIdea,
  WorkspaceMeeting,
  WorkspaceActivity,
  WorkspaceLeaderboard,
  WorkspaceMember,
  WorkspaceInvite,
} from '../../src/api/workspaces';
import { getThemedShadow } from '../../src/components/ThemedComponents';
import { handlePostSaveNotificationPermission } from '../../src/utils/permissionHandler';
import DateTimeField from '../../components/DateTimeField';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const MODULES = [
  { id: 'notes', label: 'Notes', icon: 'document-text' },
  { id: 'tasks', label: 'Kanban', icon: 'list' },
  { id: 'goals', label: 'Goals', icon: 'trending-up' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'discussions', label: 'Discussions', icon: 'chatbubbles' },
  { id: 'knowledge', label: 'Knowledge', icon: 'book' },
  { id: 'brainstorm', label: 'Brainstorm', icon: 'bulb' },
  { id: 'meetings', label: 'Meetings', icon: 'people' },
  { id: 'ai', label: 'AI Assistant', icon: 'sparkles' },
  { id: 'analytics', label: 'Leaderboard', icon: 'stats-chart' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const THEME_COLORS: Record<string, string> = {
  purple: '#7C4DFF',
  blue: '#2979FF',
  emerald: '#00E676',
  amber: '#FFC400',
  rose: '#FF1744',
};

export default function WorkspaceDetailScreen() {
  const { id, module } = useLocalSearchParams<{ id: string; module?: string }>();
  const workspaceId = parseInt(id || '0');
  const router = useRouter();
  const { theme, colors, isDark } = useTheme();
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();
  const commentsScrollRef = useRef<ScrollView>(null);

  const [activeModule, setActiveModule] = useState('notes');
  const [accentColor, setAccentColor] = useState(theme.primary);

  useEffect(() => {
    if (module) {
      setActiveModule(module);
    }
  }, [module]);

  useEffect(() => {
    if (workspaceId) {
      syncWorkspaceNotifications().catch(err => {
        console.warn('[WorkspaceDetail] Failed to sync workspace local notifications', err);
      });
    }
  }, [workspaceId]);

  // Trigger Light Haptic
  const triggerHaptic = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  // Queries
  const { data: workspace, isLoading: loadingWs, refetch: refetchWs } = useQuery<Workspace>({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspacesApi.getWorkspace(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: notes, refetch: refetchNotes } = useQuery<WorkspaceNote[]>({
    queryKey: ['workspace-notes', workspaceId],
    queryFn: () => workspacesApi.getNotes(workspaceId),
    enabled: !!workspaceId,
  });


  const { data: tasks, refetch: refetchTasks } = useQuery<WorkspaceTask[]>({
    queryKey: ['workspace-tasks', workspaceId],
    queryFn: () => workspacesApi.getTasks(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: goals, refetch: refetchGoals } = useQuery<WorkspaceGoal[]>({
    queryKey: ['workspace-goals', workspaceId],
    queryFn: () => workspacesApi.getGoals(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: events, refetch: refetchEvents } = useQuery<WorkspaceEvent[]>({
    queryKey: ['workspace-events', workspaceId],
    queryFn: () => workspacesApi.getEvents(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: discussions, refetch: refetchDiscussions } = useQuery<WorkspaceDiscussion[]>({
    queryKey: ['workspace-discussions', workspaceId],
    queryFn: () => workspacesApi.getDiscussions(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: knowledge, refetch: refetchKnowledge } = useQuery<WorkspaceKnowledge[]>({
    queryKey: ['workspace-knowledge', workspaceId],
    queryFn: () => workspacesApi.getKnowledge(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: ideas, refetch: refetchIdeas } = useQuery<WorkspaceIdea[]>({
    queryKey: ['workspace-ideas', workspaceId],
    queryFn: () => workspacesApi.getIdeas(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: meetings, refetch: refetchMeetings } = useQuery<WorkspaceMeeting[]>({
    queryKey: ['workspace-meetings', workspaceId],
    queryFn: () => workspacesApi.getMeetings(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: leaderboard, refetch: refetchAnalytics } = useQuery<WorkspaceLeaderboard>({
    queryKey: ['workspace-analytics', workspaceId],
    queryFn: () => workspacesApi.getAnalytics(workspaceId),
    enabled: !!workspaceId,
  });

  const { data: activities, refetch: refetchActivities } = useQuery<WorkspaceActivity[]>({
    queryKey: ['workspace-activities', workspaceId],
    queryFn: () => workspacesApi.getActivities(workspaceId),
    enabled: !!workspaceId,
  });

  // Automatically update accent color based on workspace theme
  useEffect(() => {
    if (workspace?.theme && THEME_COLORS[workspace.theme]) {
      setAccentColor(THEME_COLORS[workspace.theme]);
    }
  }, [workspace]);

  // Current User Role
  const memberObj = workspace?.members?.find(m => m.user_id === currentUser?.id);
  const currentUserRole = memberObj ? memberObj.role : 'Viewer';
  const isGuest = !memberObj;


  // Permission helper
  const canEditOrDelete = (item: any) => {
    if (!item) return false;
    if (currentUserRole === 'Viewer') return false;
    if (currentUserRole === 'Owner' || currentUserRole === 'Admin') return true;
    const creatorId = item.creator_id ?? item.user_id ?? item.organizer_id;
    return creatorId === currentUser?.id;
  };

  const [inviteLinks, setInviteLinks] = useState<WorkspaceInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [expiresInSelect, setExpiresInSelect] = useState<number | undefined>(undefined);

  const fetchInviteLinks = async () => {
    if (!workspaceId) return;
    if (workspace?.privacy_level !== 'Invite Only') return;
    if (currentUserRole !== 'Owner' && currentUserRole !== 'Admin') return;
    try {
      setLoadingInvites(true);
      const data = await workspacesApi.listInvites(workspaceId);
      setInviteLinks(data);
    } catch (e) {
      console.log('Error loading invites', e);
    } finally {
      setLoadingInvites(false);
    }
  };

  // Mutation to join public workspace
  const joinMutation = useMutation({
    mutationFn: () => workspacesApi.joinPublicWorkspace(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      refetchWs();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || 'Failed to join workspace.');
    }
  });

  const handleJoinWorkspace = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    joinMutation.mutate();
  };

  // Mutation to generate invite link
  const generateInviteMutation = useMutation({
    mutationFn: (expiresInHours?: number) => workspacesApi.generateInvite(workspaceId, expiresInHours),
    onSuccess: () => {
      fetchInviteLinks();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || 'Failed to generate invite link');
    }
  });

  // Mutation to revoke invite link
  const revokeInviteMutation = useMutation({
    mutationFn: (token: string) => workspacesApi.revokeInvite(workspaceId, token),
    onSuccess: () => {
      fetchInviteLinks();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {}
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || 'Failed to revoke invite link');
    }
  });

  // Refetch active module data on select
  useEffect(() => {
    if (activeModule === 'notes') refetchNotes();
    if (activeModule === 'tasks') refetchTasks();
    if (activeModule === 'goals') refetchGoals();
    if (activeModule === 'calendar') refetchEvents();
    if (activeModule === 'discussions') refetchDiscussions();
    if (activeModule === 'knowledge') refetchKnowledge();
    if (activeModule === 'brainstorm') refetchIdeas();
    if (activeModule === 'meetings') refetchMeetings();
    if (activeModule === 'analytics') refetchAnalytics();
    if (activeModule === 'settings') {
      refetchWs();
      refetchActivities();
      fetchInviteLinks();
    }
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === 'settings' && workspace) {
      fetchInviteLinks();
    }
  }, [workspace, currentUserRole, activeModule]);


  // ── MODULE 1: NOTES LOGIC ───────────────────────────────────────
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedNote, setSelectedNote] = useState<WorkspaceNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState('');
  const [noteCommentText, setNoteCommentText] = useState('');

  // Editing Note States
  const [editNoteModalVisible, setEditNoteModalVisible] = useState(false);
  const [editNoteId, setEditNoteId] = useState<number | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteCategory, setEditNoteCategory] = useState('');
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  // Copy & Share States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [sharingNoteId, setSharingNoteId] = useState<number | null>(null);

  // Toast effect
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error') => {
    setToast({ message, type });
  };

  // Helper functions
  const formatNoteText = (note: WorkspaceNote) => {
    let text = `Title: ${note.title}\nCategory: ${note.category || 'General'}\n\n${note.content}`;
    if (note.ai_summary) {
      text += `\n\nAI Summary:\n${note.ai_summary}`;
    }
    return text;
  };

  const handleCopyNote = async (note: WorkspaceNote) => {
    if (!note.content) {
      showToast('Nothing to copy', 'warning');
      return;
    }
    try {
      const formatted = formatNoteText(note);
      await Clipboard.setStringAsync(formatted);
      showToast('✅ Note copied to clipboard', 'success');
    } catch (error) {
      showToast('Failed to copy note', 'error');
    }
  };

  const handleShareNote = async (note: WorkspaceNote) => {
    if (!note.content) {
      showToast('Nothing to share', 'warning');
      return;
    }
    try {
      setSharingNoteId(note.id);
      const formatted = formatNoteText(note);
      await Share.share({
        message: formatted,
        title: note.title,
      });
    } catch (error) {
      showToast('Failed to share note', 'error');
    } finally {
      setSharingNoteId(null);
    }
  };

  const handleNoteLongPress = (note: WorkspaceNote) => {
    const options: any[] = [
      {
        text: '📋 Copy Note',
        onPress: () => { handleCopyNote(note); }
      },
      {
        text: '📤 Share Note',
        onPress: () => { handleShareNote(note); }
      }
    ];

    if (canEditOrDelete(note)) {
      options.push(
        {
          text: '✏️ Edit Note',
          onPress: () => { handleOpenEditNote(note); }
        },
        {
          text: '🗑️ Delete Note',
          onPress: () => { handleDeleteNote(note.id); },
          style: 'destructive' as const
        }
      );
    }

    options.push({
      text: '❌ Cancel',
      style: 'cancel' as const,
      onPress: () => {}
    });

    Alert.alert(
      note.title,
      'Choose an action for this note',
      options,
      { cancelable: true }
    );
  };

  // Queries for Note Details & Comments (Issue 1 & 2 & 3)
  const { data: currentNoteDetail = null } = useQuery<WorkspaceNote | null>({
    queryKey: ['workspace-note', selectedNote?.id],
    queryFn: () => selectedNote ? workspacesApi.getNote(workspaceId, selectedNote.id) : null,
    enabled: !!selectedNote,
  });

  const { data: noteComments = [] } = useQuery<any[]>({
    queryKey: ['workspace-comments', selectedNote?.id],
    queryFn: () => selectedNote ? workspacesApi.getNoteComments(workspaceId, selectedNote.id) : Promise.resolve([]),
    enabled: !!selectedNote,
    refetchInterval: 3000, // Poll every 3 seconds for real-time discussion feed!
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { title: string; content: string; category?: string }) => workspacesApi.createNote(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setNoteModalVisible(false);
      resetNoteForm();
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: (args: { noteId: number; data: Partial<WorkspaceNote> }) =>
      workspacesApi.updateNote(workspaceId, args.noteId, args.data),
    onMutate: async (newNote) => {
      await queryClient.cancelQueries({ queryKey: ['workspace-notes', workspaceId] });
      await queryClient.cancelQueries({ queryKey: ['workspace-note', newNote.noteId] });

      const previousNotes = queryClient.getQueryData<WorkspaceNote[]>(['workspace-notes', workspaceId]);
      const previousNoteDetail = queryClient.getQueryData<WorkspaceNote>(['workspace-note', newNote.noteId]);

      if (previousNotes) {
        queryClient.setQueryData<WorkspaceNote[]>(
          ['workspace-notes', workspaceId],
          previousNotes.map(n => n.id === newNote.noteId ? { ...n, ...newNote.data } : n)
        );
      }

      if (previousNoteDetail) {
        queryClient.setQueryData<WorkspaceNote>(
          ['workspace-note', newNote.noteId],
          { ...previousNoteDetail, ...newNote.data }
        );
      }

      return { previousNotes, previousNoteDetail, noteId: newNote.noteId };
    },
    onError: (err, newNote, context) => {
      if (context) {
        queryClient.setQueryData(['workspace-notes', workspaceId], context.previousNotes);
        queryClient.setQueryData(['workspace-note', context.noteId], context.previousNoteDetail);
      }
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<WorkspaceNote>(['workspace-note', updatedNote.id], updatedNote);
      queryClient.setQueryData<WorkspaceNote[]>(
        ['workspace-notes', workspaceId],
        (old) => (old || []).map(n => n.id === updatedNote.id ? updatedNote : n)
      );

      queryClient.invalidateQueries({ queryKey: ['workspace-note', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });

      setSelectedNote(updatedNote);
      setEditNoteModalVisible(false);
      setEditNoteId(null);
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => workspacesApi.deleteNote(workspaceId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setSelectedNote(null);
    }
  });

  const summarizeNoteMutation = useMutation({
    mutationFn: (noteId: number) => workspacesApi.summarizeNote(workspaceId, noteId),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<WorkspaceNote>(['workspace-note', updatedNote.id], updatedNote);
      queryClient.setQueryData<WorkspaceNote[]>(
        ['workspace-notes', workspaceId],
        (old) => (old || []).map(n => n.id === updatedNote.id ? updatedNote : n)
      );
      queryClient.invalidateQueries({ queryKey: ['workspace-note', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setSelectedNote(updatedNote);
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || 'Failed to generate AI summary');
    }
  });

  const deleteNoteSummaryMutation = useMutation({
    mutationFn: (noteId: number) => workspacesApi.deleteNoteSummary(workspaceId, noteId),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<WorkspaceNote>(['workspace-note', updatedNote.id], updatedNote);
      queryClient.setQueryData<WorkspaceNote[]>(
        ['workspace-notes', workspaceId],
        (old) => (old || []).map(n => n.id === updatedNote.id ? updatedNote : n)
      );
      queryClient.invalidateQueries({ queryKey: ['workspace-note', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setSelectedNote(updatedNote);
    },
    onError: (error: any) => {
      alert(error?.response?.data?.detail || 'Failed to delete AI summary');
    }
  });

  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const commentNoteMutation = useMutation({
    mutationFn: (data: { noteId: number; content: string }) => workspacesApi.commentOnNote(workspaceId, data.noteId, data.content),
    onMutate: async (newCommentData) => {
      await queryClient.cancelQueries({ queryKey: ['workspace-comments', newCommentData.noteId] });
      const previousComments = queryClient.getQueryData<any[]>(['workspace-comments', newCommentData.noteId]) || [];

      // Optimistically insert new comment
      const optimisticComment = {
        id: `temp-${Date.now()}`,
        user_id: currentUser?.id || 0,
        full_name: currentUser?.full_name || 'Me',
        content: newCommentData.content,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<any[]>(['workspace-comments', newCommentData.noteId], (old) => {
        return [...(old || []), optimisticComment];
      });

      return { previousComments, noteId: newCommentData.noteId };
    },
    onError: (err, newCommentData, context) => {
      if (context) {
        queryClient.setQueryData(['workspace-comments', context.noteId], context.previousComments);
      }
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData<any[]>(['workspace-comments', updatedNote.id], updatedNote.comments || []);
      
      queryClient.invalidateQueries({ queryKey: ['workspace-comments', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-note', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });

      setSelectedNote(updatedNote);

      setNoteCommentText('');
      setTimeout(() => {
        commentsScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => workspacesApi.deleteCommentOnNote(workspaceId, selectedNote!.id, commentId),
    onMutate: async (commentId) => {
      setDeletingCommentId(commentId);
      const noteId = selectedNote!.id;
      await queryClient.cancelQueries({ queryKey: ['workspace-comments', noteId] });
      const previousComments = queryClient.getQueryData<any[]>(['workspace-comments', noteId]) || [];

      // Optimistically remove comment
      queryClient.setQueryData<any[]>(['workspace-comments', noteId], (old) => {
        return (old || []).filter(c => c.id !== commentId);
      });

      return { previousComments, noteId };
    },
    onError: (err, commentId, context) => {
      setDeletingCommentId(null);
      if (context) {
        queryClient.setQueryData(['workspace-comments', context.noteId], context.previousComments);
      }
    },
    onSuccess: (updatedNote) => {
      setDeletingCommentId(null);
      queryClient.setQueryData<any[]>(['workspace-comments', updatedNote.id], updatedNote.comments || []);

      queryClient.invalidateQueries({ queryKey: ['workspace-comments', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-note', updatedNote.id] });
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });

      setSelectedNote(updatedNote);
    }
  });

  const handleOpenEditNote = (note: WorkspaceNote) => {
    setEditNoteId(note.id);
    setEditNoteTitle(note.title);
    setEditNoteContent(note.content);
    setEditNoteCategory(note.category || '');
    setEditNoteModalVisible(true);
  };

  const handleSaveEditNote = () => {
    if (!editNoteId || !editNoteTitle.trim() || !editNoteContent.trim()) return;
    updateNoteMutation.mutate({
      noteId: editNoteId,
      data: {
        title: editNoteTitle.trim(),
        content: editNoteContent.trim(),
        category: editNoteCategory.trim()
      }
    });
  };

  const handleDeleteNote = (noteId: number) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteNoteMutation.mutate(noteId);
          }
        }
      ]
    );
  };

  const handleSendComment = () => {
    const cleaned = noteCommentText.trim();
    if (!cleaned) return;
    commentNoteMutation.mutate({ noteId: selectedNote!.id, content: cleaned });
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteCommentMutation.mutate(commentId);
          }
        }
      ]
    );
  };

  const resetNoteForm = () => {
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('');
  };


  const handleCreateNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      alert('Note title and content are required');
      return;
    }
    createNoteMutation.mutate({ title: noteTitle, content: noteContent, category: noteCategory || undefined });
  };

  // ── MODULE 2: KANBAN TASKS LOGIC ────────────────────────────────
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);

  const [selectedGoal, setSelectedGoal] = useState<WorkspaceGoal | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<WorkspaceEvent | null>(null);
  const [selectedDiscussion, setSelectedDiscussion] = useState<WorkspaceDiscussion | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<WorkspaceKnowledge | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<WorkspaceIdea | null>(null);

  const [goalCommentText, setGoalCommentText] = useState('');
  const [eventCommentText, setEventCommentText] = useState('');
  const [discCommentText, setDiscCommentText] = useState('');
  const [knowCommentText, setKnowCommentText] = useState('');
  const [ideaCommentText, setIdeaCommentText] = useState('');
  const [meetCommentText, setMeetCommentText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskStatus, setTaskStatus] = useState('To Do');
  const [taskAssignee, setTaskAssignee] = useState<number | undefined>(undefined);
  const [taskTags, setTaskTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtaskInput, setSubtaskInput] = useState('');
  const [taskCommentText, setTaskCommentText] = useState('');
  const [taskDueDate, setTaskDueDate] = useState<string | undefined>(undefined);

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createTask(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceId] });
      setTaskModalVisible(false);
      resetTaskForm();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data: { taskId: number; body: Partial<WorkspaceTask> }) => workspacesApi.updateTask(workspaceId, data.taskId, data.body),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceId] });
      if (selectedTask && selectedTask.id === updated.id) {
        setSelectedTask(updated);
      }
    }
  });

  const commentTaskMutation = useMutation({
    mutationFn: (data: { taskId: number; content: string }) => workspacesApi.commentOnTask(workspaceId, data.taskId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceId] });
      setSelectedTask(updated);
      setTaskCommentText('');
    }
  });

  const deleteCommentTaskMutation = useMutation({
    mutationFn: (data: { taskId: number; commentId: string }) => workspacesApi.deleteCommentOnTask(workspaceId, data.taskId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceId] });
      setSelectedTask(updated);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => workspacesApi.deleteTask(workspaceId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-tasks', workspaceId] });
      setSelectedTask(null);
    }
  });

  // Goals comment mutations
  const commentGoalMutation = useMutation({
    mutationFn: (data: { goalId: number; content: string }) => workspacesApi.commentOnGoal(workspaceId, data.goalId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
      setSelectedGoal(updated);
      setGoalCommentText('');
    }
  });

  const deleteCommentGoalMutation = useMutation({
    mutationFn: (data: { goalId: number; commentId: string }) => workspacesApi.deleteCommentOnGoal(workspaceId, data.goalId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
      setSelectedGoal(updated);
    }
  });

  // Events comment mutations
  const commentEventMutation = useMutation({
    mutationFn: (data: { eventId: number; content: string }) => workspacesApi.commentOnEvent(workspaceId, data.eventId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-events', workspaceId] });
      setSelectedEvent(updated);
      setEventCommentText('');
    }
  });

  const deleteCommentEventMutation = useMutation({
    mutationFn: (data: { eventId: number; commentId: string }) => workspacesApi.deleteCommentOnEvent(workspaceId, data.eventId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-events', workspaceId] });
      setSelectedEvent(updated);
    }
  });

  // Discussions comment mutations
  const commentDiscussionMutation = useMutation({
    mutationFn: (data: { discussionId: number; content: string }) => workspacesApi.commentOnDiscussion(workspaceId, data.discussionId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
      setSelectedDiscussion(updated);
      setDiscCommentText('');
    }
  });

  const deleteCommentDiscussionMutation = useMutation({
    mutationFn: (data: { discussionId: number; commentId: string }) => workspacesApi.deleteCommentOnDiscussion(workspaceId, data.discussionId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
      setSelectedDiscussion(updated);
    }
  });

  // Knowledge comment mutations
  const commentKnowledgeMutation = useMutation({
    mutationFn: (data: { knowledgeId: number; content: string }) => workspacesApi.commentOnKnowledge(workspaceId, data.knowledgeId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-knowledge', workspaceId] });
      setSelectedKnowledge(updated);
      setKnowCommentText('');
    }
  });

  const deleteCommentKnowledgeMutation = useMutation({
    mutationFn: (data: { knowledgeId: number; commentId: string }) => workspacesApi.deleteCommentOnKnowledge(workspaceId, data.knowledgeId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-knowledge', workspaceId] });
      setSelectedKnowledge(updated);
    }
  });

  // Ideas comment mutations
  const commentIdeaMutation = useMutation({
    mutationFn: (data: { ideaId: number; content: string }) => workspacesApi.commentOnIdea(workspaceId, data.ideaId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
      setSelectedIdea(updated);
      setIdeaCommentText('');
    }
  });

  const deleteCommentIdeaMutation = useMutation({
    mutationFn: (data: { ideaId: number; commentId: string }) => workspacesApi.deleteCommentOnIdea(workspaceId, data.ideaId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
      setSelectedIdea(updated);
    }
  });

  // Meetings comment mutations
  const commentMeetingMutation = useMutation({
    mutationFn: (data: { meetingId: number; content: string }) => workspacesApi.commentOnMeeting(workspaceId, data.meetingId, data.content),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      setSelectedMeeting(updated);
      setMeetCommentText('');
    }
  });

  const deleteCommentMeetingMutation = useMutation({
    mutationFn: (data: { meetingId: number; commentId: string }) => workspacesApi.deleteCommentOnMeeting(workspaceId, data.meetingId, data.commentId),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      setSelectedMeeting(updated);
    }
  });

  // Generic Deletion Helper
  const handleDeleteCommentGeneric = (commentId: string, entityType: string, entityId: number) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            if (entityType === 'task') {
              deleteCommentTaskMutation.mutate({ taskId: entityId, commentId });
            } else if (entityType === 'goal') {
              deleteCommentGoalMutation.mutate({ goalId: entityId, commentId });
            } else if (entityType === 'event') {
              deleteCommentEventMutation.mutate({ eventId: entityId, commentId });
            } else if (entityType === 'discussion') {
              deleteCommentDiscussionMutation.mutate({ discussionId: entityId, commentId });
            } else if (entityType === 'knowledge') {
              deleteCommentKnowledgeMutation.mutate({ knowledgeId: entityId, commentId });
            } else if (entityType === 'idea') {
              deleteCommentIdeaMutation.mutate({ ideaId: entityId, commentId });
            } else if (entityType === 'meeting') {
              deleteCommentMeetingMutation.mutate({ meetingId: entityId, commentId });
            }
          }
        }
      ]
    );
  };

  // Edit task states
  const [editTaskModalVisible, setEditTaskModalVisible] = useState(false);
  const [editTaskId, setEditTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState('Medium');
  const [editTaskAssignee, setEditTaskAssignee] = useState<number | undefined>(undefined);
  const [editTaskTags, setEditTaskTags] = useState<string[]>([]);
  const [editTagInput, setEditTagInput] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string | undefined>(undefined);

  const handleOpenEditTask = (task: WorkspaceTask) => {
    setEditTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskPriority(task.priority || 'Medium');
    setEditTaskAssignee(task.assignee_id ?? undefined);
    setEditTaskTags(task.tags || []);
    setEditTagInput('');
    setEditTaskDueDate(task.due_date || undefined);
    setEditTaskModalVisible(true);
  };

  const handleSaveEditTask = () => {
    if (!editTaskId || !editTaskTitle.trim()) return;
    updateTaskMutation.mutate({
      taskId: editTaskId,
      body: {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || undefined,
        priority: editTaskPriority,
        assignee_id: editTaskAssignee,
        tags: editTaskTags,
        due_date: editTaskDueDate || undefined,
      }
    }, {
      onSuccess: () => {
        setEditTaskModalVisible(false);
      }
    });
  };

  const handleDeleteTask = (taskId: number) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteTaskMutation.mutate(taskId);
          }
        }
      ]
    );
  };

  const resetTaskForm = () => {
    setTaskTitle('');
    setTaskDesc('');
    setTaskPriority('Medium');
    setTaskStatus('To Do');
    setTaskAssignee(undefined);
    setTaskTags([]);
    setTagInput('');
    setTaskDueDate(undefined);
  };

  const handleCreateTask = () => {
    if (!taskTitle.trim()) {
      alert('Task title is required');
      return;
    }
    createTaskMutation.mutate({
      title: taskTitle,
      description: taskDesc || undefined,
      priority: taskPriority,
      status: taskStatus,
      assignee_id: taskAssignee,
      tags: taskTags,
      due_date: taskDueDate || undefined,
    });
  };

  // ── MODULE 3: GOALS LOGIC ───────────────────────────────────────
  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalMilestones, setGoalMilestones] = useState<{ name: string; completed: boolean }[]>([]);
  const [milestoneInput, setMilestoneInput] = useState('');

  const createGoalMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createGoal(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
      setGoalModalVisible(false);
      setGoalTitle('');
      setGoalMilestones([]);
      setMilestoneInput('');
    }
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: (data: { goalId: number; milestones: any[] }) => workspacesApi.updateGoal(workspaceId, data.goalId, { milestones: data.milestones }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: (data: { goalId: number; body: Partial<WorkspaceGoal> }) => workspacesApi.updateGoal(workspaceId, data.goalId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
      setEditGoalModalVisible(false);
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) => workspacesApi.deleteGoal(workspaceId, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-goals', workspaceId] });
    }
  });

  // Edit Goal states
  const [editGoalModalVisible, setEditGoalModalVisible] = useState(false);
  const [editGoalId, setEditGoalId] = useState<number | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalMilestones, setEditGoalMilestones] = useState<{ name: string; completed: boolean }[]>([]);
  const [editMilestoneInput, setEditMilestoneInput] = useState('');

  const handleOpenEditGoal = (goal: WorkspaceGoal) => {
    setEditGoalId(goal.id);
    setEditGoalTitle(goal.title);
    setEditGoalMilestones(goal.milestones || []);
    setEditMilestoneInput('');
    setEditGoalModalVisible(true);
  };

  const handleSaveEditGoal = () => {
    if (!editGoalId || !editGoalTitle.trim()) return;
    updateGoalMutation.mutate({
      goalId: editGoalId,
      body: {
        title: editGoalTitle.trim(),
        milestones: editGoalMilestones,
      }
    });
  };

  const handleDeleteGoal = (goalId: number) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteGoalMutation.mutate(goalId);
          }
        }
      ]
    );
  };

  // ── MODULE 4: CALENDAR LOGIC ────────────────────────────────────
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventType, setEventType] = useState('Deadline');
  const [eventDate, setEventDate] = useState(new Date().toISOString());
  const [conflictReport, setConflictReport] = useState<string | null>(null);
  const [checkingConflict, setCheckingConflict] = useState(false);

  const createEventMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createEvent(workspaceId, data),
    onSuccess: (newEvent) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-events', workspaceId] });
      setEventModalVisible(false);
      setEventTitle('');
      setEventDesc('');
      setEventType('Deadline');
      if (newEvent && workspace) {
        scheduleWorkspaceEventNotifications(newEvent, workspace.name).catch(console.error);
      }
      handlePostSaveNotificationPermission(() => {});
    }
  });

  const runConflictCheck = async () => {
    setCheckingConflict(true);
    triggerHaptic();
    try {
      const res = await workspacesApi.checkConflicts(workspaceId);
      setConflictReport(res.report);
    } catch (e) {
      setConflictReport("Failed to verify schedules.");
    } finally {
      setCheckingConflict(false);
    }
  };

  const updateEventMutation = useMutation({
    mutationFn: (data: { eventId: number; body: Partial<WorkspaceEvent> }) => workspacesApi.updateEvent(workspaceId, data.eventId, data.body),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-events', workspaceId] });
      setEditEventModalVisible(false);
      if (updated && workspace) {
        scheduleWorkspaceEventNotifications(updated, workspace.name).catch(console.error);
      }
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => workspacesApi.deleteEvent(workspaceId, eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-events', workspaceId] });
      cancelWorkspaceEventNotifications(eventId).catch(console.error);
    }
  });

  // Edit Event states
  const [editEventModalVisible, setEditEventModalVisible] = useState(false);
  const [editEventId, setEditEventId] = useState<number | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventType, setEventTypeEdit] = useState('Deadline');
  const [editEventDate, setEditEventDate] = useState('');

  const handleOpenEditEvent = (event: WorkspaceEvent) => {
    setEditEventId(event.id);
    setEditEventTitle(event.title);
    setEditEventDesc(event.description || '');
    setEventTypeEdit(event.type || 'Deadline');
    setEditEventDate(event.date || new Date().toISOString());
    setEditEventModalVisible(true);
  };

  const handleSaveEditEvent = () => {
    if (!editEventId || !editEventTitle.trim()) return;
    updateEventMutation.mutate({
      eventId: editEventId,
      body: {
        title: editEventTitle.trim(),
        description: editEventDesc.trim() || undefined,
        type: editEventType,
        date: new Date(editEventDate).toISOString()
      }
    });
  };

  const handleDeleteEvent = (eventId: number) => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteEventMutation.mutate(eventId);
          }
        }
      ]
    );
  };

  // ── MODULE 5: DISCUSSIONS LOGIC ─────────────────────────────────
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');
  const [discCategory, setDiscCategory] = useState('General');
  const [discModalVisible, setDiscModalVisible] = useState(false);

  const createDiscMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createDiscussion(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
      setDiscModalVisible(false);
      setDiscTitle('');
      setDiscContent('');
      setDiscCategory('General');
    }
  });

  const reactMutation = useMutation({
    mutationFn: (data: { discId: number; emoji: string }) => workspacesApi.reactToDiscussion(workspaceId, data.discId, data.emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
    }
  });

  const updateDiscussionMutation = useMutation({
    mutationFn: (data: { discId: number; body: Partial<WorkspaceDiscussion> }) => workspacesApi.updateDiscussion(workspaceId, data.discId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
      setEditDiscModalVisible(false);
    }
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: (discId: number) => workspacesApi.deleteDiscussion(workspaceId, discId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-discussions', workspaceId] });
    }
  });

  // Edit Discussion states
  const [editDiscModalVisible, setEditDiscModalVisible] = useState(false);
  const [editDiscId, setEditDiscId] = useState<number | null>(null);
  const [editDiscTitle, setEditDiscTitle] = useState('');
  const [editDiscContent, setEditDiscContent] = useState('');
  const [editDiscCategory, setEditDiscCategory] = useState('General');

  const handleOpenEditDiscussion = (disc: WorkspaceDiscussion) => {
    setEditDiscId(disc.id);
    setEditDiscTitle(disc.title);
    setEditDiscContent(disc.content);
    setEditDiscCategory(disc.category || 'General');
    setEditDiscModalVisible(true);
  };

  const handleSaveEditDiscussion = () => {
    if (!editDiscId || !editDiscTitle.trim() || !editDiscContent.trim()) return;
    updateDiscussionMutation.mutate({
      discId: editDiscId,
      body: {
        title: editDiscTitle.trim(),
        content: editDiscContent.trim(),
        category: editDiscCategory,
      }
    });
  };

  const handleDeleteDiscussion = (discId: number) => {
    Alert.alert(
      "Delete Discussion",
      "Are you sure you want to delete this discussion thread?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteDiscussionMutation.mutate(discId);
          }
        }
      ]
    );
  };

  // ── MODULE 6: KNOWLEDGE WALL LOGIC ──────────────────────────────
  const [knowTitle, setKnowTitle] = useState('');
  const [knowContent, setKnowContent] = useState('');
  const [knowCategory, setKnowCategory] = useState('General');
  const [knowModalVisible, setKnowModalVisible] = useState(false);
  const [organizedTree, setOrganizedTree] = useState<string | null>(null);
  const [organizingWall, setOrganizingWall] = useState(false);

  const createKnowledgeMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createKnowledge(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-knowledge', workspaceId] });
      setKnowModalVisible(false);
      setKnowTitle('');
      setKnowContent('');
      setKnowCategory('General');
    }
  });

  const runKnowledgeOrganize = async () => {
    setOrganizingWall(true);
    triggerHaptic();
    try {
      const res = await workspacesApi.organizeKnowledge(workspaceId);
      setOrganizedTree(res.tree);
    } catch (e) {
      setOrganizedTree("Failed to organize contributions.");
    } finally {
      setOrganizingWall(false);
    }
  };

  const updateKnowledgeMutation = useMutation({
    mutationFn: (data: { knowId: number; body: Partial<WorkspaceKnowledge> }) => workspacesApi.updateKnowledge(workspaceId, data.knowId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-knowledge', workspaceId] });
      setEditKnowModalVisible(false);
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: (knowId: number) => workspacesApi.deleteKnowledge(workspaceId, knowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-knowledge', workspaceId] });
    }
  });

  // Edit Knowledge states
  const [editKnowModalVisible, setEditKnowModalVisible] = useState(false);
  const [editKnowId, setEditKnowId] = useState<number | null>(null);
  const [editKnowTitle, setEditKnowTitle] = useState('');
  const [editKnowContent, setEditKnowContent] = useState('');
  const [editKnowCategory, setEditKnowCategory] = useState('General');

  const handleOpenEditKnowledge = (know: WorkspaceKnowledge) => {
    setEditKnowId(know.id);
    setEditKnowTitle(know.title);
    setEditKnowContent(know.content);
    setEditKnowCategory(know.category || 'General');
    setEditKnowModalVisible(true);
  };

  const handleSaveEditKnowledge = () => {
    if (!editKnowId || !editKnowTitle.trim() || !editKnowContent.trim()) return;
    updateKnowledgeMutation.mutate({
      knowId: editKnowId,
      body: {
        title: editKnowTitle.trim(),
        content: editKnowContent.trim(),
        category: editKnowCategory,
      }
    });
  };

  const handleDeleteKnowledge = (knowId: number) => {
    Alert.alert(
      "Delete Knowledge entry",
      "Are you sure you want to delete this knowledge contribution?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteKnowledgeMutation.mutate(knowId);
          }
        }
      ]
    );
  };

  // ── MODULE 7: BRAINSTORM BOARD LOGIC ─────────────────────────────
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaContent, setIdeaContent] = useState('');
  const [ideaCategory, setIdeaCategory] = useState('General');
  const [ideaModalVisible, setIdeaModalVisible] = useState(false);
  const [clusteredReport, setClusteredReport] = useState<string | null>(null);
  const [clusteringIdeas, setClusteringIdeas] = useState(false);

  const createIdeaMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createIdea(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
      setIdeaModalVisible(false);
      setIdeaTitle('');
      setIdeaContent('');
      setIdeaCategory('General');
    }
  });

  const voteMutation = useMutation({
    mutationFn: (ideaId: number) => workspacesApi.voteIdea(workspaceId, ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
    }
  });

  const runIdeaClustering = async () => {
    setClusteringIdeas(true);
    triggerHaptic();
    try {
      const res = await workspacesApi.clusterIdeas(workspaceId);
      setClusteredReport(res.report);
    } catch (e) {
      setClusteredReport("Failed to cluster brainstorming stickies.");
    } finally {
      setClusteringIdeas(false);
    }
  };

  const updateIdeaMutation = useMutation({
    mutationFn: (data: { ideaId: number; body: Partial<WorkspaceIdea> }) => workspacesApi.updateIdea(workspaceId, data.ideaId, data.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
      setEditIdeaModalVisible(false);
    }
  });

  const deleteIdeaMutation = useMutation({
    mutationFn: (ideaId: number) => workspacesApi.deleteIdea(workspaceId, ideaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-ideas', workspaceId] });
    }
  });

  // Edit Idea states
  const [editIdeaModalVisible, setEditIdeaModalVisible] = useState(false);
  const [editIdeaId, setEditIdeaId] = useState<number | null>(null);
  const [editIdeaTitle, setEditIdeaTitle] = useState('');
  const [editIdeaContent, setEditIdeaContent] = useState('');
  const [editIdeaCategory, setEditIdeaCategory] = useState('General');

  const handleOpenEditIdea = (idea: WorkspaceIdea) => {
    setEditIdeaId(idea.id);
    setEditIdeaTitle(idea.title);
    setEditIdeaContent(idea.content);
    setEditIdeaCategory(idea.category || 'General');
    setEditIdeaModalVisible(true);
  };

  const handleSaveEditIdea = () => {
    if (!editIdeaId || !editIdeaTitle.trim() || !editIdeaContent.trim()) return;
    updateIdeaMutation.mutate({
      ideaId: editIdeaId,
      body: {
        title: editIdeaTitle.trim(),
        content: editIdeaContent.trim(),
        category: editIdeaCategory,
      }
    });
  };

  const handleDeleteIdea = (ideaId: number) => {
    Alert.alert(
      "Delete Sticky Idea",
      "Are you sure you want to delete this brainstorm sticky note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteIdeaMutation.mutate(ideaId);
          }
        }
      ]
    );
  };

  // ── MODULE 8: MEETING CENTER LOGIC ──────────────────────────────
  const [meetTitle, setMeetTitle] = useState('');
  const [meetDate, setMeetDate] = useState(new Date().toISOString());
  const [meetAgenda, setMeetAgenda] = useState('');
  const [meetModalVisible, setMeetModalVisible] = useState(false);
  
  const [selectedMeeting, setSelectedMeeting] = useState<WorkspaceMeeting | null>(null);
  const [meetNotesText, setMeetNotesText] = useState('');
  const [generatingMinutes, setGeneratingMinutes] = useState(false);

  const createMeetingMutation = useMutation({
    mutationFn: (data: any) => workspacesApi.createMeeting(workspaceId, data),
    onSuccess: (newMeeting) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      setMeetModalVisible(false);
      setMeetTitle('');
      setMeetAgenda('');
      if (newMeeting && workspace) {
        scheduleWorkspaceMeetingNotifications(newMeeting, workspace.name).catch(console.error);
      }
      handlePostSaveNotificationPermission(() => {});
    }
  });

  const triggerMinutesGeneration = async () => {
    if (!selectedMeeting || !meetNotesText.trim()) return;
    setGeneratingMinutes(true);
    triggerHaptic();
    try {
      const updated = await workspacesApi.generateMinutes(workspaceId, selectedMeeting.id, meetNotesText);
      setSelectedMeeting(updated);
      setMeetNotesText('');
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      alert("AI Minutes generated! Follow-up tasks have been auto-added to the Kanban board.");
    } catch (e) {
      alert("AI was unable to parse meeting notes into minutes.");
    } finally {
      setGeneratingMinutes(false);
    }
  };

  const updateMeetingMutation = useMutation({
    mutationFn: (data: { meetingId: number; body: Partial<WorkspaceMeeting> }) => workspacesApi.updateMeeting(workspaceId, data.meetingId, data.body),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      setEditMeetModalVisible(false);
      if (selectedMeeting && selectedMeeting.id === updated.id) {
        setSelectedMeeting(updated);
      }
      if (updated && workspace) {
        scheduleWorkspaceMeetingNotifications(updated, workspace.name).catch(console.error);
      }
    }
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (meetingId: number) => workspacesApi.deleteMeeting(workspaceId, meetingId),
    onSuccess: (_, meetingId) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-meetings', workspaceId] });
      setSelectedMeeting(null);
      cancelWorkspaceMeetingNotifications(meetingId).catch(console.error);
    }
  });

  // Edit Meeting states
  const [editMeetModalVisible, setEditMeetModalVisible] = useState(false);
  const [editMeetId, setEditMeetId] = useState<number | null>(null);
  const [editMeetTitle, setEditMeetTitle] = useState('');
  const [editMeetAgenda, setEditMeetAgenda] = useState('');
  const [editMeetDate, setEditMeetDate] = useState('');

  const handleOpenEditMeeting = (meeting: WorkspaceMeeting) => {
    setEditMeetId(meeting.id);
    setEditMeetTitle(meeting.title);
    setEditMeetAgenda(meeting.agenda || '');
    setEditMeetDate(meeting.date || new Date().toISOString());
    setEditMeetModalVisible(true);
  };

  const handleSaveEditMeeting = () => {
    if (!editMeetId || !editMeetTitle.trim()) return;
    updateMeetingMutation.mutate({
      meetingId: editMeetId,
      body: {
        title: editMeetTitle.trim(),
        agenda: editMeetAgenda.trim() || undefined,
        date: new Date(editMeetDate).toISOString()
      }
    });
  };

  const handleDeleteMeeting = (meetingId: number) => {
    Alert.alert(
      "Delete Meeting",
      "Are you sure you want to delete this meeting? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            triggerHaptic();
            deleteMeetingMutation.mutate(meetingId);
          }
        }
      ]
    );
  };

  // ── MODULE 9: AI ASSISTANT LOGIC ────────────────────────────────
  const [aiInput, setAiInput] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { sender: 'ai', text: "Hello! I am your KnoVault Workspace Assistant. I'm connected to the Team Memory. Ask me anything about tasks, goals, decisions, or activity history." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const handleAskAI = async () => {
    if (!aiInput.trim()) return;
    const question = aiInput;
    setAiInput('');
    setAiChatHistory(prev => [...prev, { sender: 'user', text: question }]);
    setAiLoading(true);
    triggerHaptic();

    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await workspacesApi.askAssistant(workspaceId, question);
      setAiChatHistory(prev => [...prev, { sender: 'ai', text: res.response }]);
    } catch (e) {
      setAiChatHistory(prev => [...prev, { sender: 'ai', text: "Sorry, I ran into an error connecting to Groq. Please check database configuration." }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  // ── MODULE 10: SETTINGS / MEMBERSHIP LOGIC ──────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Member');
  const [inviting, setInviting] = useState(false);

  const inviteMemberMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => workspacesApi.inviteMember(workspaceId, data.email, data.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      setInviteEmail('');
      setInviteRole('Member');
      alert("Member added successfully!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || "Invitation failed.");
    }
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: number) => workspacesApi.removeMember(workspaceId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      alert("Member removed.");
    }
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => workspacesApi.deleteWorkspace(workspaceId),
    onSuccess: () => {
      alert("Workspace deleted successfully.");
      router.replace('/(tabs)/workspaces');
    }
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      alert("Email is required");
      return;
    }
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const handleLeave = async () => {
    const member = workspace?.members?.find(m => m.user_id === currentUser?.id);
    if (!member) return;
    Alert.alert(
      "Leave Workspace",
      "Are you sure you want to leave this workspace?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            await workspacesApi.removeMember(workspaceId, member.id);
            router.replace('/(tabs)/workspaces');
          }
        }
      ]
    );
  };

  if (loadingWs || !workspace) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ marginTop: 10, color: theme.textSecondary }}>Connecting to workspace...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Workspace Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerDetails}>
          <Text style={styles.emojiHeading}>{workspace.icon}</Text>
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.workspaceTitle, { color: theme.text }]} numberOfLines={1}>
              {workspace.name}
            </Text>
            <Text style={[styles.workspaceMeta, { color: colors.text.tertiary }]}>
              {workspace.category} • {workspace.privacy_level}
            </Text>
          </View>
        </View>
      </View>

      {/* Join Workspace Banner for Guests */}
      {isGuest && (
        <View style={[styles.joinBanner, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}30` }]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.joinBannerTitle, { color: theme.text }]}>Viewer Mode</Text>
            <Text style={[styles.joinBannerText, { color: theme.textSecondary }]}>
              {workspace.privacy_level === 'Public' 
                ? 'You are viewing this public workspace. Join to participate!' 
                : 'You are viewing this workspace via invite link. Join to participate!'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.joinBannerBtn, { backgroundColor: accentColor }]}
            onPress={handleJoinWorkspace}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.joinBannerBtnText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
      )}


      {/* Horizontally scrolling tab navigation */}
      <View style={[styles.tabBarContainer, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {MODULES.map((m) => {
            const isSelected = activeModule === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isSelected ? accentColor : 'transparent',
                  }
                ]}
                onPress={() => {
                  triggerHaptic();
                  setActiveModule(m.id);
                }}
              >
                <Ionicons name={m.icon as any} size={15} color={isSelected ? '#FFFFFF' : theme.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.tabLabel, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.moduleContentScroll} showsVerticalScrollIndicator={false}>
          
          {/* NOTES MODULE */}
          {activeModule === 'notes' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Shared Notes</Text>
                {currentUserRole !== 'Viewer' && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => setNoteModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>Add Note</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!notes || notes.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>No notes shared yet. Write something to get AI summaries!</Text>
              ) : (
                notes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedNote(note);
                      setNoteCommentText('');
                    }}
                    onLongPress={() => handleNoteLongPress(note)}
                  >
                    <View style={styles.noteCardHeader}>
                      <Text style={[styles.noteTitle, { color: theme.text }]}>{note.title}</Text>
                      {note.category && (
                        <View style={[styles.smallBadge, { backgroundColor: `${accentColor}15` }]}>
                          <Text style={[styles.smallBadgeText, { color: accentColor }]}>{note.category}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.noteContentPreview, { color: theme.textSecondary }]} numberOfLines={3}>
                      {note.content}
                    </Text>
                    {note.ai_summary && (
                      <View style={[styles.aiSummaryBox, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#312E81' : '#E0E7FF' }]}>
                        <Ionicons name="sparkles" size={14} color="#6366F1" style={{ marginRight: 6, marginTop: 2 }} />
                        <Text style={[styles.aiSummaryText, { color: isDark ? '#C7D2FE' : '#4338CA' }]} numberOfLines={2}>
                          {note.ai_summary}
                        </Text>
                      </View>
                    )}
                    <View style={styles.noteCardFooter}>
                      <Text style={[styles.authorLabel, { color: colors.text.tertiary }]}>By {note.author_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleCopyNote(note);
                          }}
                          style={{ padding: 4 }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          disabled={!note.content}
                        >
                          <Ionicons name="copy-outline" size={14} color={colors.text.tertiary} style={!note.content && { opacity: 0.4 }} />
                        </TouchableOpacity>
                        <View style={styles.commentsIndicator}>
                          <Ionicons name="chatbubble-outline" size={14} color={colors.text.tertiary} style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{note.comments?.length || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* KANBAN TASKS MODULE */}
          {activeModule === 'tasks' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Task Board</Text>
                {currentUserRole !== 'Viewer' && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => setTaskModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>New Task</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Columns Selector (Horizontal scrollable columns layout) */}
              <View style={styles.kanbanScrollSelector}>
                {['To Do', 'In Progress', 'Review', 'Completed'].map((col) => {
                  const colTasks = tasks?.filter(t => t.status === col) || [];
                  return (
                    <View key={col} style={[styles.kanbanCol, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <View style={[styles.kanbanColHeader, { borderBottomColor: theme.border }]}>
                        <Text style={[styles.kanbanColTitle, { color: theme.text }]}>{col}</Text>
                        <View style={[styles.countBadge, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                          <Text style={[styles.countBadgeText, { color: theme.textSecondary }]}>{colTasks.length}</Text>
                        </View>
                      </View>
                      <View style={styles.kanbanList}>
                        {colTasks.length === 0 ? (
                          <Text style={[styles.kanbanEmptyText, { color: colors.text.tertiary }]}>Empty column</Text>
                        ) : (
                          colTasks.map((t) => (
                            <TouchableOpacity
                              key={t.id}
                              style={[styles.taskCard, { backgroundColor: theme.background, borderColor: theme.border }]}
                              onPress={() => {
                                setSelectedTask(t);
                                setTaskCommentText('');
                              }}
                            >
                              <Text style={[styles.taskCardTitle, { color: theme.text }]}>{t.title}</Text>
                              {t.description && (
                                <Text style={[styles.taskCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                                  {t.description}
                                </Text>
                              )}
                              <View style={styles.taskCardRow}>
                                <View style={[styles.priorityBadge, { backgroundColor: t.priority === 'High' ? '#FF174415' : (t.priority === 'Medium' ? '#FFC40015' : '#00E67615') }]}>
                                  <Text style={[styles.priorityBadgeText, { color: t.priority === 'High' ? '#FF1744' : (t.priority === 'Medium' ? '#FFB300' : '#00E676') }]}>
                                    {t.priority}
                                  </Text>
                                </View>
                                {t.assignee_name && (
                                  <Text style={[styles.assigneeText, { color: colors.text.tertiary }]} numberOfLines={1}>
                                    👤 {t.assignee_name}
                                  </Text>
                                )}
                              </View>
                              {t.due_date && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                  <Ionicons name="calendar-outline" size={11} color={colors.text.tertiary} style={{ marginRight: 4 }} />
                                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>
                                    Due: {new Date(t.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          ))
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* GOALS MODULE */}
          {activeModule === 'goals' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Shared Goals</Text>
                {currentUserRole !== 'Viewer' && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => setGoalModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>Create Goal</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!goals || goals.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>No shared goals established.</Text>
              ) : (
                goals.map((g) => (
                  <View key={g.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.goalCardHeader}>
                      <View style={{ flex: 1 }}>
                        <TouchableOpacity onPress={() => { setSelectedGoal(g); setGoalCommentText(''); }}>
                          <Text style={[styles.goalTitle, { color: theme.text }]}>{g.title}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>Created by {g.creator_name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.goalProgressContainer, { backgroundColor: `${accentColor}10` }]}>
                          <Text style={[styles.goalProgressPercent, { color: accentColor }]}>{g.progress}%</Text>
                        </View>
                        {canEditOrDelete(g) && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
                            <TouchableOpacity onPress={() => handleOpenEditGoal(g)} style={{ padding: 4, marginRight: 4 }}>
                              <Ionicons name="create-outline" size={18} color={accentColor} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteGoal(g.id)} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: accentColor, width: `${g.progress}%` }]} />
                    </View>

                    {/* Milestones Checklist */}
                    {g.milestones && g.milestones.length > 0 && (
                      <View style={styles.milestoneList}>
                        {g.milestones.map((m, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.milestoneItem}
                            disabled={currentUserRole === 'Viewer'}
                            onPress={() => {
                              triggerHaptic();
                              const updated = g.milestones.map((ms, mIdx) =>
                                mIdx === idx ? { ...ms, completed: !ms.completed } : ms
                              );
                              toggleMilestoneMutation.mutate({ goalId: g.id, milestones: updated });
                            }}
                          >
                            <Ionicons
                              name={m.completed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={m.completed ? accentColor : colors.text.tertiary}
                              style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.milestoneText, { color: m.completed ? colors.text.tertiary : theme.text, textDecorationLine: m.completed ? 'line-through' : 'none' }]}>
                              {m.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* CALENDAR MODULE */}
          {activeModule === 'calendar' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Workspace Schedule</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.aiBtnHeader, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#E0E7FF' }]}
                    onPress={runConflictCheck}
                    disabled={checkingConflict}
                  >
                    {checkingConflict ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={[styles.aiBtnTextHeader, { color: isDark ? '#C7D2FE' : '#4338CA' }]}>Conflict Check</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {currentUserRole !== 'Viewer' && (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: accentColor }]}
                      onPress={() => setEventModalVisible(true)}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {conflictReport && (
                <View style={[styles.conflictAlertCard, { backgroundColor: isDark ? '#182235' : '#F0F9FF', borderColor: isDark ? '#1E3A8A' : '#BAE6FD' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="alert-circle" size={18} color="#0284C7" style={{ marginRight: 6 }} />
                      <Text style={{ fontWeight: 'bold', color: isDark ? '#E0F2FE' : '#0369A1' }}>AI Conflict Report</Text>
                    </View>
                    <TouchableOpacity onPress={() => setConflictReport(null)}>
                      <Ionicons name="close" size={16} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: isDark ? '#BAE6FD' : '#0284C7' }}>{conflictReport}</Text>
                </View>
              )}

              {!events || events.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>No scheduled activities found.</Text>
              ) : (
                events.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => { setSelectedEvent(e); setEventCommentText(''); }}
                    style={[styles.eventCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View style={styles.eventLeft}>
                      <View style={[styles.eventTag, { backgroundColor: e.type === 'Deadline' ? '#EF4444' : (e.type === 'Meeting' ? '#3B82F6' : (e.type === 'Exam' ? '#8B5CF6' : '#10B981')) }]} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.eventTitleText, { color: theme.text }]}>{e.title}</Text>
                        {e.description && <Text style={[styles.eventDescText, { color: theme.textSecondary }]}>{e.description}</Text>}
                      </View>
                    </View>
                    <View style={styles.eventRight}>
                      <Text style={[styles.eventDateText, { color: accentColor }]}>
                        {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {canEditOrDelete(e) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'flex-end' }}>
                          <TouchableOpacity onPress={() => handleOpenEditEvent(e)} style={{ padding: 4, marginRight: 8 }}>
                            <Ionicons name="create-outline" size={16} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteEvent(e.id)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* DISCUSSIONS HUB MODULE */}
          {activeModule === 'discussions' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Discussion Hub</Text>
                {currentUserRole !== 'Viewer' && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => setDiscModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>New Thread</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!discussions || discussions.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>No discussion threads yet. Start the conversation!</Text>
              ) : (
                discussions.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => { setSelectedDiscussion(d); setDiscCommentText(''); }}
                    style={[styles.discCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View style={[styles.discHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.discTitleText, { color: theme.text }]}>{d.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
                          Posted by {d.author_name} • {d.category}
                        </Text>
                      </View>
                      {canEditOrDelete(d) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => handleOpenEditDiscussion(d)} style={{ padding: 4, marginRight: 8 }}>
                            <Ionicons name="create-outline" size={18} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteDiscussion(d.id)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.discBody, { color: theme.textSecondary }]}>{d.content}</Text>
                    
                    {/* Reactions Row */}
                    <View style={styles.reactionsRow}>
                      {['👍', '❤️', '🔥', '💡', '🚀'].map((emoji) => {
                        const reactors = d.reactions?.[emoji] || [];
                        const hasReacted = reactors.includes(currentUser?.id || 0);
                        return (
                          <TouchableOpacity
                            key={emoji}
                            style={[
                              styles.reactBtn,
                              {
                                backgroundColor: hasReacted ? `${accentColor}15` : (isDark ? '#334155' : '#F1F5F9'),
                                borderColor: hasReacted ? accentColor : 'transparent',
                              }
                            ]}
                            onPress={() => reactMutation.mutate({ discId: d.id, emoji })}
                          >
                            <Text style={styles.reactEmoji}>{emoji}</Text>
                            <Text style={[styles.reactCount, { color: hasReacted ? accentColor : theme.textSecondary }]}>
                              {reactors.length}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* KNOWLEDGE WALL MODULE */}
          {activeModule === 'knowledge' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Knowledge Wall</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.aiBtnHeader, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#E0E7FF' }]}
                    onPress={runKnowledgeOrganize}
                    disabled={organizingWall}
                  >
                    {organizingWall ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={[styles.aiBtnTextHeader, { color: isDark ? '#C7D2FE' : '#4338CA' }]}>AI Organize</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {currentUserRole !== 'Viewer' && (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: accentColor }]}
                      onPress={() => setKnowModalVisible(true)}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {organizedTree && (
                <View style={[styles.treeOutputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: theme.text }}>AI Organized Taxonomy</Text>
                    <TouchableOpacity onPress={() => setOrganizedTree(null)}>
                      <Ionicons name="close" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: theme.textSecondary }}>
                    {organizedTree}
                  </Text>
                </View>
              )}

              {!knowledge || knowledge.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>Knowledge wall is currently empty. Add learnings!</Text>
              ) : (
                knowledge.map((k) => (
                  <TouchableOpacity
                    key={k.id}
                    onPress={() => { setSelectedKnowledge(k); setKnowCommentText(''); }}
                    style={[styles.knowCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <View style={[styles.knowHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.knowTitleText, { color: theme.text }]}>{k.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={[styles.smallBadge, { backgroundColor: `${accentColor}15`, marginRight: 8 }]}>
                            <Text style={[styles.smallBadgeText, { color: accentColor }]}>{k.category}</Text>
                          </View>
                          <Text style={[styles.knowAuthor, { color: colors.text.tertiary, fontSize: 11 }]}>by {k.author_name}</Text>
                        </View>
                      </View>
                      {canEditOrDelete(k) && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => handleOpenEditKnowledge(k)} style={{ padding: 4, marginRight: 8 }}>
                            <Ionicons name="create-outline" size={18} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteKnowledge(k.id)} style={{ padding: 4 }}>
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.knowBody, { color: theme.textSecondary }]}>{k.content}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* BRAINSTORM STICKY BOARD MODULE */}
          {activeModule === 'brainstorm' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Sticky Ideas</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.aiBtnHeader, { backgroundColor: isDark ? '#312E81' : '#EEF2FF', borderColor: isDark ? '#4338CA' : '#E0E7FF' }]}
                    onPress={runIdeaClustering}
                    disabled={clusteringIdeas}
                  >
                    {clusteringIdeas ? (
                      <ActivityIndicator size="small" color="#6366F1" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={14} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={[styles.aiBtnTextHeader, { color: isDark ? '#C7D2FE' : '#4338CA' }]}>AI Cluster</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {currentUserRole !== 'Viewer' && (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: accentColor }]}
                      onPress={() => setIdeaModalVisible(true)}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {clusteredReport && (
                <View style={[styles.treeOutputCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontWeight: 'bold', color: theme.text }}>AI Concept Clusters</Text>
                    <TouchableOpacity onPress={() => setClusteredReport(null)}>
                      <Ionicons name="close" size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 13, lineHeight: 18, color: theme.textSecondary }}>{clusteredReport}</Text>
                </View>
              )}

              <View style={styles.stickiesGrid}>
                {!ideas || ideas.length === 0 ? (
                  <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>Double tap Add button to stick brainstorm notes.</Text>
                ) : (
                  ideas.map((idea, idx) => {
                    const bgColors = ['#FEF08A', '#BBF7D0', '#FBCFE8', '#BFDBFE'];
                    const stickyBg = bgColors[idx % bgColors.length];
                    const hasVoted = idea.votes?.includes(currentUser?.id || 0);

                    return (
                      <TouchableOpacity
                        key={idea.id}
                        onPress={() => { setSelectedIdea(idea); setIdeaCommentText(''); }}
                        style={[styles.stickyNote, { backgroundColor: stickyBg }]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text style={[styles.stickyTitle, { flex: 1, marginRight: 6 }]}>{idea.title}</Text>
                          {canEditOrDelete(idea) && (
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              <TouchableOpacity onPress={() => handleOpenEditIdea(idea)} style={{ padding: 2 }}>
                                <Ionicons name="create-outline" size={15} color="#1E293B" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleDeleteIdea(idea.id)} style={{ padding: 2 }}>
                                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                        <Text style={styles.stickyContent} numberOfLines={5}>{idea.content}</Text>
                        
                        <View style={styles.stickyFooter}>
                          <Text style={styles.stickyAuthor}>@{idea.author_name?.split(' ')[0]}</Text>
                          <TouchableOpacity
                            style={[styles.stickyVote, { backgroundColor: hasVoted ? 'rgba(0,0,0,0.15)' : 'transparent' }]}
                            onPress={() => voteMutation.mutate(idea.id)}
                          >
                            <Ionicons name={hasVoted ? 'heart' : 'heart-outline'} size={15} color="#FF1744" />
                            <Text style={styles.stickyVoteCount}>{idea.votes?.length || 0}</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* MEETING CENTER MODULE */}
          {activeModule === 'meetings' && (
            <View>
              <View style={styles.moduleHeaderRow}>
                <Text style={[styles.moduleTitle, { color: theme.text }]}>Meeting Center</Text>
                {currentUserRole !== 'Viewer' && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: accentColor }]}
                    onPress={() => setMeetModalVisible(true)}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.addBtnText}>Schedule</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!meetings || meetings.length === 0 ? (
                <Text style={[styles.noItemsText, { color: colors.text.tertiary }]}>No meetings scheduled.</Text>
              ) : (
                meetings.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.meetCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                    onPress={() => {
                      setSelectedMeeting(m);
                      setMeetNotesText('');
                    }}
                  >
                    <View style={styles.meetHeaderRow}>
                      <Ionicons name="videocam" size={20} color={accentColor} style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.meetTitleText, { color: theme.text }]}>{m.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginTop: 4 }}>
                          {new Date(m.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                    </View>
                    {m.agenda && (
                      <Text style={[styles.meetAgendaText, { color: theme.textSecondary }]} numberOfLines={1}>
                        Agenda: {m.agenda}
                      </Text>
                    )}
                    {m.summary && (
                      <View style={[styles.minutesBlock, { borderColor: theme.border }]}>
                        <Text style={[styles.minutesLabel, { color: accentColor }]}>AI Minutes Summarized</Text>
                        <Text style={[styles.minutesSummaryText, { color: theme.textSecondary }]} numberOfLines={2}>
                          {m.summary}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* AI ASSISTANT PANEL MODULE */}
          {activeModule === 'ai' && (
            <View style={styles.chatContainer}>
              <ScrollView
                ref={chatScrollRef}
                style={[styles.chatHistory, { backgroundColor: theme.card, borderColor: theme.border }]}
                contentContainerStyle={{ padding: 15 }}
                showsVerticalScrollIndicator={false}
              >
                {aiChatHistory.map((chat, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.chatBubble,
                      chat.sender === 'user' ? [styles.chatUser, { backgroundColor: accentColor }] : [styles.chatAI, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]
                    ]}
                  >
                    <Text style={[styles.chatBubbleText, { color: chat.sender === 'user' ? '#FFFFFF' : theme.text }]}>
                      {chat.text}
                    </Text>
                  </View>
                ))}
                {aiLoading && (
                  <View style={styles.chatLoading}>
                    <ActivityIndicator size="small" color={accentColor} />
                    <Text style={{ fontSize: 12, color: colors.text.tertiary, marginLeft: 8 }}>AI Assistant is searching Team Memory...</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.chatInputRow}>
                <TextInput
                  placeholder="Ask Assistant about deadlines, notes, or tasks..."
                  placeholderTextColor={colors.text.tertiary}
                  value={aiInput}
                  onChangeText={setAiInput}
                  onSubmitEditing={handleAskAI}
                  style={[styles.chatTextInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, { backgroundColor: accentColor }]}
                  onPress={handleAskAI}
                >
                  <Ionicons name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PRODUCTIVITY ANALYTICS & LEADERBOARD MODULE */}
          {activeModule === 'analytics' && (
            <View>
              <Text style={[styles.moduleTitle, { color: theme.text, marginBottom: 15 }]}>Productivity Analytics</Text>

              {/* Champions Cards */}
              {leaderboard && (
                <View style={styles.championsContainer}>
                  {leaderboard.top_contributor && (
                    <View style={[styles.champCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={{ fontSize: 24 }}>🏆</Text>
                      <Text style={[styles.champTitle, { color: colors.text.tertiary }]}>Top Contributor</Text>
                      <Text style={[styles.champName, { color: theme.text }]} numberOfLines={1}>
                        {leaderboard.top_contributor.user_name}
                      </Text>
                      <Text style={[styles.champScore, { color: accentColor }]}>
                        {leaderboard.top_contributor.contribution_score} pts
                      </Text>
                    </View>
                  )}

                  {leaderboard.most_productive && (
                    <View style={[styles.champCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={{ fontSize: 24 }}>⚡</Text>
                      <Text style={[styles.champTitle, { color: colors.text.tertiary }]}>Most Productive</Text>
                      <Text style={[styles.champName, { color: theme.text }]} numberOfLines={1}>
                        {leaderboard.most_productive.user_name}
                      </Text>
                      <Text style={[styles.champScore, { color: '#10B981' }]}>
                        {leaderboard.most_productive.tasks_completed} tasks
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Leaderboard Table List */}
              <View style={[styles.leaderboardBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.tableHeader, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.tableColHeader, { flex: 2, color: theme.textSecondary }]}>Member</Text>
                  <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'center', color: theme.textSecondary }]}>Activity</Text>
                  <Text style={[styles.tableColHeader, { flex: 1, textAlign: 'right', color: theme.textSecondary }]}>Score</Text>
                </View>
                {!leaderboard?.members || leaderboard.members.length === 0 ? (
                  <Text style={{ padding: 20, textAlign: 'center', color: colors.text.tertiary }}>Calculating metrics...</Text>
                ) : (
                  leaderboard.members.map((mem, index) => (
                    <View key={mem.user_id} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.rankNumber, { color: accentColor }]}>#{index + 1}</Text>
                        <Text style={[styles.rowText, { color: theme.text }]} numberOfLines={1}>
                          {mem.user_name}
                        </Text>
                      </View>
                      <Text style={[styles.rowText, { flex: 1, textAlign: 'center', color: theme.textSecondary }]}>
                        {mem.workspace_activity}
                      </Text>
                      <Text style={[styles.rowText, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: theme.text }]}>
                        {mem.contribution_score}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

          {/* SETTINGS MODULE */}
          {activeModule === 'settings' && (
            <View>
              <Text style={[styles.moduleTitle, { color: theme.text, marginBottom: 15 }]}>Workspace Members</Text>

              {/* Invite Section */}
              {currentUserRole !== 'Viewer' && (
                <View style={[styles.inviteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.inviteLabel, { color: theme.text }]}>Add New Member</Text>
                  <TextInput
                    placeholder="Enter teammate's registered email"
                    placeholderTextColor={colors.text.tertiary}
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.input, { color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                  />
                  <View style={styles.rolePickerRow}>
                    {['Admin', 'Member', 'Viewer'].map((r) => (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.rolePill,
                          {
                            backgroundColor: inviteRole === r ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                            borderColor: inviteRole === r ? accentColor : 'transparent',
                          }
                        ]}
                        onPress={() => setInviteRole(r)}
                      >
                        <Text style={[styles.rolePillLabel, { color: inviteRole === r ? '#FFFFFF' : theme.textSecondary }]}>
                          {r}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.inviteBtnSubmit, { backgroundColor: accentColor }]}
                    onPress={handleInvite}
                    disabled={inviteMemberMutation.isPending}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Add Member</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Privacy-specific additions */}
              {workspace.privacy_level === 'Private' && (
                <View style={[styles.privacyInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="lock-closed" size={20} color={accentColor} style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary }}>
                    This is a <Text style={{ fontWeight: 'bold' }}>Private Workspace</Text>. Invite links are disabled. Members must be added manually by Owners or Admins.
                  </Text>
                </View>
              )}

              {workspace.privacy_level === 'Public' && (
                <View style={[styles.privacyInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="globe-outline" size={20} color={accentColor} style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.textSecondary }}>
                    This is a <Text style={{ fontWeight: 'bold' }}>Public Workspace</Text>. Anyone can browse and join directly from their workspaces menu.
                  </Text>
                </View>
              )}

              {workspace.privacy_level === 'Invite Only' && currentUserRole !== 'Viewer' && (
                <View style={[styles.inviteCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.inviteLabel, { color: theme.text }]}>Invite Links</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12 }}>
                    Generate invite codes/tokens that other users can use to join this workspace.
                  </Text>

                  <Text style={[styles.inviteSubLabel, { color: theme.textSecondary, marginBottom: 6 }]}>Link Expiration</Text>
                  <View style={[styles.rolePickerRow, { marginBottom: 12 }]}>
                    {[
                      { label: 'Never', value: undefined },
                      { label: '1 Hr', value: 1 },
                      { label: '24 Hr', value: 24 },
                      { label: '7 Days', value: 168 },
                    ].map((opt) => (
                      <TouchableOpacity
                        key={opt.label}
                        style={[
                          styles.rolePill,
                          {
                            backgroundColor: expiresInSelect === opt.value ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                            borderColor: expiresInSelect === opt.value ? accentColor : 'transparent',
                          }
                        ]}
                        onPress={() => setExpiresInSelect(opt.value)}
                      >
                        <Text style={[styles.rolePillLabel, { color: expiresInSelect === opt.value ? '#FFFFFF' : theme.textSecondary }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.inviteBtnSubmit, { backgroundColor: accentColor, marginBottom: 15 }]}
                    onPress={() => generateInviteMutation.mutate(expiresInSelect)}
                    disabled={generateInviteMutation.isPending}
                  >
                    {generateInviteMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Generate Invite Link</Text>
                    )}
                  </TouchableOpacity>

                  {/* Active Links list */}
                  <Text style={[styles.inviteSubLabel, { color: theme.text, fontWeight: '700', marginBottom: 8 }]}>Active Invite Links</Text>
                  {loadingInvites ? (
                    <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: 10 }} />
                  ) : inviteLinks.length === 0 ? (
                    <Text style={{ fontSize: 12, color: colors.text.tertiary, fontStyle: 'italic', marginVertical: 5 }}>
                      No active invite links. Create one above.
                    </Text>
                  ) : (
                    inviteLinks.map((link) => (
                      <View key={link.id} style={[styles.linkRow, { borderBottomColor: theme.border }]}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.linkCodeText, { color: theme.text }]} numberOfLines={1}>
                            Code: {link.invite_token}
                          </Text>
                          <Text style={{ fontSize: 10, color: colors.text.tertiary }}>
                            Expires: {link.expires_at ? new Date(link.expires_at).toLocaleString() : 'Never'}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={[styles.linkIconBtn, { backgroundColor: `${theme.primary}10` }]}
                            onPress={async () => {
                              try {
                                await Clipboard.setStringAsync(link.invite_token);
                                alert('Invite code copied to clipboard!');
                              } catch (e) {
                                alert('Failed to copy code');
                              }
                            }}
                          >
                            <Ionicons name="copy-outline" size={14} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.linkIconBtn, { backgroundColor: '#F8717115' }]}
                            onPress={() => {
                              Alert.alert(
                                'Revoke Invite Link',
                                'Are you sure you want to revoke this invite link? Users will no longer be able to join using this code.',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Revoke', style: 'destructive', onPress: () => revokeInviteMutation.mutate(link.invite_token) }
                                ]
                              );
                            }}
                          >
                            <Ionicons name="trash-outline" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* Members List */}
              <View style={[styles.membersBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {workspace.members.map((mem) => {
                  const isMe = mem.user_id === currentUser?.id;
                  return (
                    <View key={mem.id} style={[styles.memberRowItem, { borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.memberNameText, { color: theme.text }]}>
                          {mem.user_full_name} {isMe && '(You)'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>{mem.user_email}</Text>
                      </View>
                      <View style={styles.memberActionRight}>
                        <View style={[styles.roleLabelBadge, { backgroundColor: mem.role === 'Owner' ? '#EF444420' : (mem.role === 'Admin' ? '#3B82F620' : '#10B98120') }]}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: mem.role === 'Owner' ? '#EF4444' : (mem.role === 'Admin' ? '#3B82F6' : '#10B981') }}>
                            {mem.role}
                          </Text>
                        </View>
                        {currentUserRole === 'Owner' && !isMe && mem.role !== 'Owner' && (
                          <TouchableOpacity
                            onPress={() => removeMemberMutation.mutate(mem.id)}
                            style={styles.trashBtn}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Dangerous Area */}
              <View style={{ marginTop: 30 }}>
                {currentUserRole === 'Owner' ? (
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => {
                      Alert.alert(
                        "Delete Workspace",
                        "This operation is irreversible! Are you sure you want to delete this workspace and all its contents?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete Permanently", style: "destructive", onPress: () => deleteWorkspaceMutation.mutate() }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Delete Workspace</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.dangerBtn, { backgroundColor: '#EF4444' }]} onPress={handleLeave}>
                    <Ionicons name="exit-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Leave Workspace</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Team Memory Audit Timeline */}
              <Text style={[styles.moduleTitle, { color: theme.text, marginTop: 40, marginBottom: 15 }]}>Team Memory Log</Text>
              <View style={styles.timeline}>
                {!activities || activities.length === 0 ? (
                  <Text style={{ color: colors.text.tertiary }}>No memory logged yet.</Text>
                ) : (
                  activities.map((a, index) => (
                    <View key={a.id} style={styles.timelineItem}>
                      <View style={styles.timelineDotBox}>
                        <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
                        {index < activities.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={[styles.timelineTextMsg, { color: theme.text }]}>
                          <Text style={{ fontWeight: 'bold' }}>{a.user_name}</Text> {a.action}
                        </Text>
                        {a.details && <Text style={[styles.timelineDetails, { color: theme.textSecondary }]}>{a.details}</Text>}
                        <Text style={[styles.timelineTime, { color: colors.text.tertiary }]}>
                          {new Date(a.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── CREATE NOTE MODAL ── */}
      <Modal animationType="slide" transparent visible={noteModalVisible} onRequestClose={() => setNoteModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Share Note</Text>
                <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={noteTitle} onChangeText={setNoteTitle} placeholder="Notes topic..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
                
                <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                <TextInput value={noteCategory} onChangeText={setNoteCategory} placeholder="e.g. Science, Algorithms" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
                
                <Text style={[styles.label, { color: theme.textSecondary }]}>Content</Text>
                <TextInput value={noteContent} onChangeText={setNoteContent} multiline numberOfLines={8} placeholder="Write collaborative thoughts here..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 150 }]} />
                
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleCreateNote} disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save & Generate AI Summary</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED NOTE & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedNote} onRequestClose={() => setSelectedNote(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <View style={styles.modalTouchArea}>
            <TouchableWithoutFeedback onPress={() => setSelectedNote(null)}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
            {selectedNote && (
            <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
              {(() => {
                const noteData = currentNoteDetail || selectedNote;
                return (
                  <View style={{ flex: 1, overflow: 'hidden' }}>
                    <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[styles.detailNoteTitle, { color: theme.text }]} numberOfLines={2}>{noteData.title}</Text>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Author: {noteData.author_name || 'Unknown'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {currentUserRole !== 'Viewer' && !noteData.ai_summary && (
                          <TouchableOpacity
                            onPress={() => summarizeNoteMutation.mutate(noteData.id)}
                            style={{ marginRight: 15, padding: 4 }}
                            disabled={summarizeNoteMutation.isPending}
                          >
                            {summarizeNoteMutation.isPending ? (
                              <ActivityIndicator size="small" color="#6366F1" />
                            ) : (
                              <Ionicons name="sparkles" size={22} color="#6366F1" />
                            )}
                          </TouchableOpacity>
                        )}
                        {/* Copy Button */}
                        <TouchableOpacity
                          onPress={() => handleCopyNote(noteData)}
                          style={{ marginRight: 15, padding: 4 }}
                          disabled={!noteData.content}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="copy-outline" size={22} color={accentColor} style={!noteData.content && { opacity: 0.4 }} />
                        </TouchableOpacity>
                        {/* Share Button */}
                        <TouchableOpacity
                          onPress={() => handleShareNote(noteData)}
                          style={{ marginRight: 15, padding: 4 }}
                          disabled={!noteData.content || sharingNoteId === noteData.id}
                          activeOpacity={0.6}
                        >
                          {sharingNoteId === noteData.id ? (
                            <ActivityIndicator size="small" color={accentColor} />
                          ) : (
                            <Ionicons name="share-outline" size={22} color={accentColor} style={!noteData.content && { opacity: 0.4 }} />
                          )}
                        </TouchableOpacity>
                        {canEditOrDelete(noteData) && (
                          <>
                            <TouchableOpacity
                              onPress={() => handleOpenEditNote(noteData)}
                              style={{ marginRight: 15, padding: 4 }}
                            >
                              <Ionicons name="create-outline" size={22} color={accentColor} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDeleteNote(noteData.id)}
                              style={{ marginRight: 15, padding: 4 }}
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </TouchableOpacity>
                          </>
                        )}
                        <TouchableOpacity onPress={() => setSelectedNote(null)} style={{ padding: 4 }}>
                          <Ionicons name="close" size={26} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <ScrollView ref={commentsScrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                      <Text style={[styles.detailNoteBody, { color: theme.textSecondary }]} selectable={true}>{noteData.content}</Text>
                      
                      {noteData.ai_summary ? (
                        <View style={[styles.detailAiSummary, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#312E81' : '#E0E7FF' }]}>
                          <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: summaryCollapsed ? 0 : 8 }}
                            onPress={() => setSummaryCollapsed(!summaryCollapsed)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <Ionicons name="sparkles" size={16} color="#6366F1" style={{ marginRight: 6 }} />
                              <Text style={{ fontWeight: 'bold', color: isDark ? '#C7D2FE' : '#4338CA', fontSize: 14 }}>AI Note Insights</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              {currentUserRole !== 'Viewer' && (
                                <>
                                  {summarizeNoteMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#6366F1" />
                                  ) : (
                                    <TouchableOpacity 
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        summarizeNoteMutation.mutate(noteData.id);
                                      }}
                                      style={{ padding: 4 }}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                      <Ionicons name="refresh-outline" size={16} color={isDark ? '#C7D2FE' : '#4338CA'} />
                                    </TouchableOpacity>
                                  )}
                                  {deleteNoteSummaryMutation.isPending ? (
                                    <ActivityIndicator size="small" color="#EF4444" />
                                  ) : (
                                    <TouchableOpacity 
                                      onPress={(e) => {
                                        e.stopPropagation();
                                        Alert.alert(
                                          'Delete AI Summary',
                                          'Are you sure you want to delete this AI summary?',
                                          [
                                            { text: 'Cancel', style: 'cancel' },
                                            { text: 'Delete', style: 'destructive', onPress: () => deleteNoteSummaryMutation.mutate(noteData.id) }
                                          ]
                                        );
                                      }}
                                      style={{ padding: 4 }}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                  )}
                                </>
                              )}
                              <Ionicons 
                                name={summaryCollapsed ? "chevron-down" : "chevron-up"} 
                                size={16} 
                                color={isDark ? '#C7D2FE' : '#4338CA'} 
                              />
                            </View>
                          </TouchableOpacity>
                          {!summaryCollapsed && (
                            <View style={{ marginTop: 4 }}>
                              <Text style={{ fontSize: 13, lineHeight: 19, color: isDark ? '#A5B4FC' : '#4F46E5', marginBottom: 8 }}>
                                {noteData.ai_summary}
                              </Text>
                              <Text style={{ fontSize: 10, color: isDark ? '#818CF8' : '#6366F1', alignSelf: 'flex-end', fontStyle: 'italic' }}>
                                Updated: {new Date(noteData.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : null}

                      {/* Comments Feed */}
                      <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                      <View style={styles.commentsList}>
                        {noteComments.length === 0 && (
                          <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                        )}
                        {noteComments.map((c) => {
                          const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                          const isDeletingThis = deleteCommentMutation.isPending && deletingCommentId === c.id;
                          return (
                            <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                    {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </Text>
                                  {canDeleteComment && (
                                    <TouchableOpacity 
                                      onPress={() => handleDeleteComment(c.id)}
                                      disabled={deleteCommentMutation.isPending}
                                      style={isDeletingThis && { opacity: 0.5 }}
                                    >
                                      {isDeletingThis ? (
                                        <ActivityIndicator size="small" color="#EF4444" style={{ transform: [{ scale: 0.8 }] }} />
                                      ) : (
                                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                      )}
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                              <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                            </View>
                          );
                        })}
                      </View>

                      {/* Comment Posting Input INSIDE SCROLLVIEW */}
                      <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TextInput
                            placeholder="Write a feedback response..."
                            placeholderTextColor={colors.text.tertiary}
                            value={noteCommentText}
                            onChangeText={setNoteCommentText}
                            editable={!commentNoteMutation.isPending}
                            style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                          />
                          <TouchableOpacity
                            style={[
                              styles.commentSendBtn,
                              { backgroundColor: accentColor },
                              (commentNoteMutation.isPending || !noteCommentText.trim()) && { opacity: 0.5 }
                            ]}
                            onPress={handleSendComment}
                            disabled={commentNoteMutation.isPending || !noteCommentText.trim()}
                          >
                            {commentNoteMutation.isPending ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="send" size={16} color="#FFFFFF" />
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                );
              })()}
            </View>
          )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── EDIT NOTE MODAL ── */}
      <Modal animationType="slide" transparent visible={editNoteModalVisible} onRequestClose={() => setEditNoteModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Note</Text>
                <TouchableOpacity onPress={() => setEditNoteModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={editNoteTitle} onChangeText={setEditNoteTitle} placeholder="Notes topic..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
                
                <Text style={[styles.label, { color: theme.textSecondary }]}>Category</Text>
                <TextInput value={editNoteCategory} onChangeText={setEditNoteCategory} placeholder="e.g. Science, Algorithms" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />
                
                <Text style={[styles.label, { color: theme.textSecondary }]}>Content</Text>
                <TextInput value={editNoteContent} onChangeText={setEditNoteContent} multiline numberOfLines={8} placeholder="Write collaborative thoughts here..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 150 }]} />
                
                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditNote} disabled={updateNoteMutation.isPending}>
                  {updateNoteMutation.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE TASK MODAL ── */}
      <Modal animationType="slide" transparent visible={taskModalVisible} onRequestClose={() => setTaskModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Task</Text>
                <TouchableOpacity onPress={() => setTaskModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={taskTitle} onChangeText={setTaskTitle} placeholder="Task title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                <TextInput value={taskDesc} onChangeText={setTaskDesc} placeholder="Details about this task..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                {/* Assignee selection */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Assign Member</Text>
                <View style={styles.pickerRowWrap}>
                  {workspace.members.map((mem) => (
                    <TouchableOpacity
                      key={mem.user_id}
                      style={[
                        styles.assigneePill,
                        {
                          backgroundColor: taskAssignee === mem.user_id ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: taskAssignee === mem.user_id ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setTaskAssignee(taskAssignee === mem.user_id ? undefined : mem.user_id)}
                    >
                      <Text style={{ fontSize: 12, color: taskAssignee === mem.user_id ? '#FFFFFF' : theme.text }}>
                        {mem.user_full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Priority */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Priority</Text>
                <View style={styles.pickerRowWrap}>
                  {['High', 'Medium', 'Low'].map((pr) => (
                    <TouchableOpacity
                      key={pr}
                      style={[
                        styles.prioritySelectorBtn,
                        {
                          backgroundColor: taskPriority === pr ? (pr === 'High' ? '#EF4444' : (pr === 'Medium' ? '#FFC400' : '#10B981')) : (isDark ? '#1E293B' : '#F1F5F9'),
                        }
                      ]}
                      onPress={() => setTaskPriority(pr)}
                    >
                      <Text style={{ color: taskPriority === pr ? '#FFFFFF' : theme.textSecondary, fontWeight: 'bold' }}>{pr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tags */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    placeholder="Add tag (e.g. bug, frontend) and press +"
                    placeholderTextColor={colors.text.tertiary}
                    value={tagInput}
                    onChangeText={setTagInput}
                    style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, marginRight: 8 }]}
                  />
                  <TouchableOpacity
                    style={[styles.addTagBtn, { backgroundColor: accentColor }]}
                    onPress={() => {
                      if (tagInput.trim() && !taskTags.includes(tagInput.trim())) {
                        setTaskTags(prev => [...prev, tagInput.trim()]);
                        setTagInput('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {taskTags.length > 0 && (
                  <View style={styles.tagsPillList}>
                    {taskTags.map((tag) => (
                      <View key={tag} style={[styles.tagPill, { backgroundColor: `${accentColor}12` }]}>
                        <Text style={{ fontSize: 12, color: accentColor, marginRight: 4 }}>{tag}</Text>
                        <TouchableOpacity onPress={() => setTaskTags(prev => prev.filter(t => t !== tag))}>
                          <Ionicons name="close-circle" size={14} color={accentColor} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <DateTimeField
                  label="Due Date"
                  mode="date"
                  value={taskDueDate}
                  onChange={setTaskDueDate}
                />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleCreateTask} disabled={createTaskMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Create Task</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED TASK & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedTask} onRequestClose={() => setSelectedTask(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedTask && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedTask.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 6 }}>Creator: {selectedTask.creator_name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={[styles.priorityBadge, { backgroundColor: selectedTask.priority === 'High' ? '#FF174415' : (selectedTask.priority === 'Medium' ? '#FFC40015' : '#00E67615'), marginVertical: 0 }]}>
                          <Text style={[styles.priorityBadgeText, { color: selectedTask.priority === 'High' ? '#FF1744' : (selectedTask.priority === 'Medium' ? '#FFB300' : '#00E676') }]}>
                            {selectedTask.priority}
                          </Text>
                        </View>
                        {selectedTask.assignee_name && (
                          <View style={[styles.priorityBadge, { backgroundColor: '#7C4DFF15', marginVertical: 0 }]}>
                            <Text style={[styles.priorityBadgeText, { color: '#7C4DFF' }]}>
                              👤 {selectedTask.assignee_name}
                            </Text>
                          </View>
                        )}
                        {selectedTask.due_date && (
                          <View style={[styles.priorityBadge, { backgroundColor: '#0284C715', marginVertical: 0 }]}>
                            <Text style={[styles.priorityBadgeText, { color: '#0284C7' }]}>
                              📅 Due: {new Date(selectedTask.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedTask) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditTask(selectedTask)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteTask(selectedTask.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedTask(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    {selectedTask.description && (
                      <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                        {selectedTask.description}
                      </Text>
                    )}

                    {/* Status Toggle Row */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Move Status Column</Text>
                    <View style={styles.pickerRowWrap}>
                      {['To Do', 'In Progress', 'Review', 'Completed'].map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.statusBtnSmall,
                            {
                              backgroundColor: selectedTask.status === s ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                              borderColor: selectedTask.status === s ? accentColor : theme.border,
                            }
                          ]}
                          onPress={() => updateTaskMutation.mutate({ taskId: selectedTask.id, body: { status: s } })}
                        >
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedTask.status === s ? '#FFFFFF' : theme.textSecondary }}>
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Checklist Section */}
                    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Checklist Subtasks</Text>
                    <View style={styles.tagInputContainer}>
                      <TextInput
                        placeholder="Add subtask checklist..."
                        placeholderTextColor={colors.text.tertiary}
                        value={subtaskInput}
                        onChangeText={setSubtaskInput}
                        style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, marginRight: 8, height: 40 }]}
                      />
                      <TouchableOpacity
                        style={[styles.addTagBtn, { backgroundColor: accentColor, height: 40, width: 40 }]}
                        onPress={() => {
                          if (subtaskInput.trim()) {
                            const updated = [...(selectedTask.subtasks || []), { id: Date.now().toString(), title: subtaskInput.trim(), completed: false }];
                            updateTaskMutation.mutate({ taskId: selectedTask.id, body: { subtasks: updated } });
                            setSubtaskInput('');
                          }
                        }}
                      >
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      {selectedTask.subtasks?.map((st) => (
                        <TouchableOpacity
                          key={st.id}
                          style={styles.subtaskItemCheck}
                          onPress={() => {
                            const updated = selectedTask.subtasks.map(s =>
                              s.id === st.id ? { ...s, completed: !s.completed } : s
                            );
                            updateTaskMutation.mutate({ taskId: selectedTask.id, body: { subtasks: updated } });
                          }}
                        >
                          <Ionicons
                            name={st.completed ? 'checkbox' : 'square-outline'}
                            size={18}
                            color={st.completed ? accentColor : colors.text.tertiary}
                            style={{ marginRight: 8 }}
                          />
                          <Text style={{ fontSize: 13, color: st.completed ? colors.text.tertiary : theme.text, textDecorationLine: st.completed ? 'line-through' : 'none' }}>
                            {st.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Task Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Feedback & Activity Log</Text>
                    <View style={styles.commentsList}>
                      {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedTask.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'task', selectedTask.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={taskCommentText}
                          onChangeText={setTaskCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentTaskMutation.mutate({ taskId: selectedTask.id, content: taskCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── EDIT TASK MODAL ── */}
      <Modal animationType="slide" transparent visible={editTaskModalVisible} onRequestClose={() => setEditTaskModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Task</Text>
                <TouchableOpacity onPress={() => setEditTaskModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={editTaskTitle} onChangeText={setEditTaskTitle} placeholder="Task title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
                <TextInput value={editTaskDesc} onChangeText={setEditTaskDesc} placeholder="Details about this task..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                {/* Assignee selection */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Assign Member</Text>
                <View style={styles.pickerRowWrap}>
                  {workspace.members.map((mem) => (
                    <TouchableOpacity
                      key={mem.user_id}
                      style={[
                        styles.assigneePill,
                        {
                          backgroundColor: editTaskAssignee === mem.user_id ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: editTaskAssignee === mem.user_id ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setEditTaskAssignee(editTaskAssignee === mem.user_id ? undefined : mem.user_id)}
                    >
                      <Text style={{ fontSize: 12, color: editTaskAssignee === mem.user_id ? '#FFFFFF' : theme.text }}>
                        {mem.user_full_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Priority */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Priority</Text>
                <View style={styles.pickerRowWrap}>
                  {['High', 'Medium', 'Low'].map((pr) => (
                    <TouchableOpacity
                      key={pr}
                      style={[
                        styles.prioritySelectorBtn,
                        {
                          backgroundColor: editTaskPriority === pr ? (pr === 'High' ? '#EF4444' : (pr === 'Medium' ? '#FFC400' : '#10B981')) : (isDark ? '#1E293B' : '#F1F5F9'),
                        }
                      ]}
                      onPress={() => setEditTaskPriority(pr)}
                    >
                      <Text style={{ color: editTaskPriority === pr ? '#FFFFFF' : theme.textSecondary, fontWeight: 'bold' }}>{pr}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tags */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Tags</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    placeholder="Add tag (e.g. bug, frontend) and press +"
                    placeholderTextColor={colors.text.tertiary}
                    value={editTagInput}
                    onChangeText={setEditTagInput}
                    style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, marginRight: 8 }]}
                  />
                  <TouchableOpacity
                    style={[styles.addTagBtn, { backgroundColor: accentColor }]}
                    onPress={() => {
                      if (editTagInput.trim() && !editTaskTags.includes(editTagInput.trim())) {
                        setEditTaskTags(prev => [...prev, editTagInput.trim()]);
                        setEditTagInput('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {editTaskTags.length > 0 && (
                  <View style={styles.tagsPillList}>
                    {editTaskTags.map((tag) => (
                      <View key={tag} style={[styles.tagPill, { backgroundColor: `${accentColor}12` }]}>
                        <Text style={{ fontSize: 12, color: accentColor, marginRight: 4 }}>{tag}</Text>
                        <TouchableOpacity onPress={() => setEditTaskTags(prev => prev.filter(t => t !== tag))}>
                          <Ionicons name="close-circle" size={14} color={accentColor} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <DateTimeField
                  label="Due Date"
                  mode="date"
                  value={editTaskDueDate}
                  onChange={setEditTaskDueDate}
                />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditTask} disabled={updateTaskMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE GOAL MODAL ── */}
      <Modal animationType="slide" transparent visible={goalModalVisible} onRequestClose={() => setGoalModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Create Workspace Goal</Text>
                <TouchableOpacity onPress={() => setGoalModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Goal Objective</Text>
                <TextInput value={goalTitle} onChangeText={setGoalTitle} placeholder="e.g. Launch Beta Version" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Add Milestones Step</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    placeholder="Milestone title..."
                    placeholderTextColor={colors.text.tertiary}
                    value={milestoneInput}
                    onChangeText={setMilestoneInput}
                    style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, marginRight: 8 }]}
                  />
                  <TouchableOpacity
                    style={[styles.addTagBtn, { backgroundColor: accentColor }]}
                    onPress={() => {
                      if (milestoneInput.trim()) {
                        setGoalMilestones(prev => [...prev, { name: milestoneInput.trim(), completed: false }]);
                        setMilestoneInput('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {goalMilestones.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {goalMilestones.map((m, idx) => (
                      <View key={idx} style={[styles.milestonePreRow, { borderBottomColor: theme.border }]}>
                        <Text style={{ fontSize: 13, color: theme.text }}>• {m.name}</Text>
                        <TouchableOpacity onPress={() => setGoalMilestones(prev => prev.filter((_, i) => i !== idx))}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!goalTitle.trim()) {
                    alert('Goal objective is required');
                    return;
                  }
                  createGoalMutation.mutate({ title: goalTitle, milestones: goalMilestones });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Create Goal</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT GOAL MODAL ── */}
      <Modal animationType="slide" transparent visible={editGoalModalVisible} onRequestClose={() => setEditGoalModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Workspace Goal</Text>
                <TouchableOpacity onPress={() => setEditGoalModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Goal Objective</Text>
                <TextInput value={editGoalTitle} onChangeText={setEditGoalTitle} placeholder="e.g. Launch Beta Version" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Milestones Step</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    placeholder="Milestone title..."
                    placeholderTextColor={colors.text.tertiary}
                    value={editMilestoneInput}
                    onChangeText={setEditMilestoneInput}
                    style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, marginRight: 8 }]}
                  />
                  <TouchableOpacity
                    style={[styles.addTagBtn, { backgroundColor: accentColor }]}
                    onPress={() => {
                      if (editMilestoneInput.trim()) {
                        setEditGoalMilestones(prev => [...prev, { name: editMilestoneInput.trim(), completed: false }]);
                        setEditMilestoneInput('');
                      }
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {editGoalMilestones.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {editGoalMilestones.map((m, idx) => (
                      <View key={idx} style={[styles.milestonePreRow, { borderBottomColor: theme.border }]}>
                        <Text style={{ fontSize: 13, color: theme.text }}>• {m.name}</Text>
                        <TouchableOpacity onPress={() => setEditGoalMilestones(prev => prev.filter((_, i) => i !== idx))}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditGoal} disabled={updateGoalMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE EVENT MODAL ── */}
      <Modal animationType="slide" transparent visible={eventModalVisible} onRequestClose={() => setEventModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Workspace Event</Text>
                <TouchableOpacity onPress={() => setEventModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={eventTitle} onChangeText={setEventTitle} placeholder="Event name..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Details</Text>
                <TextInput value={eventDesc} onChangeText={setEventDesc} placeholder="Description..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Event Type</Text>
                <View style={styles.pickerRowWrap}>
                  {['Deadline', 'Meeting', 'Exam', 'Milestone', 'Event'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.statusBtnSmall,
                        {
                          backgroundColor: eventType === t ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: eventType === t ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setEventType(t)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: eventType === t ? '#FFFFFF' : theme.textSecondary }}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Event Date"
                      mode="date"
                      value={eventDate}
                      onChange={setEventDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Event Time"
                      mode="time"
                      value={eventDate}
                      onChange={setEventDate}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!eventTitle.trim()) {
                    alert('Event title is required');
                    return;
                  }
                  createEventMutation.mutate({ title: eventTitle, description: eventDesc || undefined, type: eventType, date: new Date(eventDate).toISOString() });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Schedule Event</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT EVENT MODAL ── */}
      <Modal animationType="slide" transparent visible={editEventModalVisible} onRequestClose={() => setEditEventModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Schedule Event</Text>
                <TouchableOpacity onPress={() => setEditEventModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Title</Text>
                <TextInput value={editEventTitle} onChangeText={setEditEventTitle} placeholder="Event name..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Details</Text>
                <TextInput value={editEventDesc} onChangeText={setEditEventDesc} placeholder="Description..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Event Type</Text>
                <View style={styles.pickerRowWrap}>
                  {['Deadline', 'Meeting', 'Exam', 'Milestone', 'Event'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.statusBtnSmall,
                        {
                          backgroundColor: editEventType === t ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: editEventType === t ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setEventTypeEdit(t)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: editEventType === t ? '#FFFFFF' : theme.textSecondary }}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Event Date"
                      mode="date"
                      value={editEventDate}
                      onChange={setEditEventDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Event Time"
                      mode="time"
                      value={editEventDate}
                      onChange={setEditEventDate}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditEvent} disabled={updateEventMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE DISCUSSION THREAD MODAL ── */}
      <Modal animationType="slide" transparent visible={discModalVisible} onRequestClose={() => setDiscModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>New Discussion Thread</Text>
                <TouchableOpacity onPress={() => setDiscModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Topic / Title</Text>
                <TextInput value={discTitle} onChangeText={setDiscTitle} placeholder="Discussion title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Topic Category</Text>
                <View style={styles.pickerRowWrap}>
                  {['General', 'Important', 'Questions', 'Updates', 'Ideas'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.statusBtnSmall,
                        {
                          backgroundColor: discCategory === c ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: discCategory === c ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setDiscCategory(c)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: discCategory === c ? '#FFFFFF' : theme.textSecondary }}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Message Content</Text>
                <TextInput value={discContent} onChangeText={setDiscContent} multiline numberOfLines={5} placeholder="Start typing the topic context details..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 100 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!discTitle.trim() || !discContent.trim()) {
                    alert('Topic and message content are required');
                    return;
                  }
                  createDiscMutation.mutate({ title: discTitle, content: discContent, category: discCategory });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Post Thread</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT DISCUSSION THREAD MODAL ── */}
      <Modal animationType="slide" transparent visible={editDiscModalVisible} onRequestClose={() => setEditDiscModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Discussion Thread</Text>
                <TouchableOpacity onPress={() => setEditDiscModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Topic / Title</Text>
                <TextInput value={editDiscTitle} onChangeText={setEditDiscTitle} placeholder="Discussion title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Topic Category</Text>
                <View style={styles.pickerRowWrap}>
                  {['General', 'Important', 'Questions', 'Updates', 'Ideas'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.statusBtnSmall,
                        {
                          backgroundColor: editDiscCategory === c ? accentColor : (isDark ? '#334155' : '#F1F5F9'),
                          borderColor: editDiscCategory === c ? accentColor : theme.border,
                        }
                      ]}
                      onPress={() => setEditDiscCategory(c)}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: editDiscCategory === c ? '#FFFFFF' : theme.textSecondary }}>
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { color: theme.textSecondary }]}>Message Content</Text>
                <TextInput value={editDiscContent} onChangeText={setEditDiscContent} multiline numberOfLines={5} placeholder="Start typing the topic context details..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 100 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditDiscussion} disabled={updateDiscussionMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE KNOWLEDGE MODAL ── */}
      <Modal animationType="slide" transparent visible={knowModalVisible} onRequestClose={() => setKnowModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Contribute Learning / Discovery</Text>
                <TouchableOpacity onPress={() => setKnowModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Subject / Topic Title</Text>
                <TextInput value={knowTitle} onChangeText={setKnowTitle} placeholder="e.g. Greedy Interval Scheduling" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Taxonomy Category</Text>
                <TextInput value={knowCategory} onChangeText={setKnowCategory} placeholder="e.g. Algorithms -> Greedy" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Learning Summary / Insight</Text>
                <TextInput value={knowContent} onChangeText={setKnowContent} multiline numberOfLines={6} placeholder="Describe the concept formulas, explanations, and code rules..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 120 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!knowTitle.trim() || !knowContent.trim()) {
                    alert('Topic and learning summary are required');
                    return;
                  }
                  createKnowledgeMutation.mutate({ title: knowTitle, content: knowContent, category: knowCategory });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Contribute to Wall</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT KNOWLEDGE MODAL ── */}
      <Modal animationType="slide" transparent visible={editKnowModalVisible} onRequestClose={() => setEditKnowModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Knowledge Entry</Text>
                <TouchableOpacity onPress={() => setEditKnowModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Subject / Topic Title</Text>
                <TextInput value={editKnowTitle} onChangeText={setEditKnowTitle} placeholder="e.g. Greedy Interval Scheduling" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Taxonomy Category</Text>
                <TextInput value={editKnowCategory} onChangeText={setEditKnowCategory} placeholder="e.g. Algorithms -> Greedy" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Learning Summary / Insight</Text>
                <TextInput value={editKnowContent} onChangeText={setEditKnowContent} multiline numberOfLines={6} placeholder="Describe the concept formulas, explanations, and code rules..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 120 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditKnowledge} disabled={updateKnowledgeMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CREATE IDEA MODAL ── */}
      <Modal animationType="slide" transparent visible={ideaModalVisible} onRequestClose={() => setIdeaModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Stick Storm Idea</Text>
                <TouchableOpacity onPress={() => setIdeaModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Idea Title</Text>
                <TextInput value={ideaTitle} onChangeText={setIdeaTitle} placeholder="Short idea title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Thematic Category</Text>
                <TextInput value={ideaCategory} onChangeText={setIdeaCategory} placeholder="e.g. UI/UX, AI Features" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Idea Content</Text>
                <TextInput value={ideaContent} onChangeText={setIdeaContent} multiline numberOfLines={4} placeholder="Sticky note message..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 80 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!ideaTitle.trim() || !ideaContent.trim()) {
                    alert('Idea title and note contents are required');
                    return;
                  }
                  createIdeaMutation.mutate({ title: ideaTitle, content: ideaContent, category: ideaCategory });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Stick Note</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT IDEA MODAL ── */}
      <Modal animationType="slide" transparent visible={editIdeaModalVisible} onRequestClose={() => setEditIdeaModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Sticky Idea</Text>
                <TouchableOpacity onPress={() => setEditIdeaModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Idea Title</Text>
                <TextInput value={editIdeaTitle} onChangeText={setEditIdeaTitle} placeholder="Short idea title..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Thematic Category</Text>
                <TextInput value={editIdeaCategory} onChangeText={setEditIdeaCategory} placeholder="e.g. UI/UX, AI Features" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Idea Content</Text>
                <TextInput value={editIdeaContent} onChangeText={setEditIdeaContent} multiline numberOfLines={4} placeholder="Sticky note message..." placeholderTextColor={colors.text.tertiary} style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 80 }]} />

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditIdea} disabled={updateIdeaMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── SCHEDULE MEETING MODAL ── */}
      <Modal animationType="slide" transparent visible={meetModalVisible} onRequestClose={() => setMeetModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Meeting</Text>
                <TouchableOpacity onPress={() => setMeetModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Meeting Title</Text>
                <TextInput value={meetTitle} onChangeText={setMeetTitle} placeholder="e.g. Sync & Sprint Review" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Agenda Description</Text>
                <TextInput value={meetAgenda} onChangeText={setMeetAgenda} placeholder="Topics to cover..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Meeting Date"
                      mode="date"
                      value={meetDate}
                      onChange={setMeetDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Meeting Time"
                      mode="time"
                      value={meetDate}
                      onChange={setMeetDate}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={() => {
                  if (!meetTitle.trim()) {
                    alert('Meeting title is required');
                    return;
                  }
                  createMeetingMutation.mutate({ title: meetTitle, date: new Date(meetDate).toISOString(), agenda: meetAgenda || undefined });
                }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Schedule Meeting</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EDIT MEETING MODAL ── */}
      <Modal animationType="slide" transparent visible={editMeetModalVisible} onRequestClose={() => setEditMeetModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Meeting</Text>
                <TouchableOpacity onPress={() => setEditMeetModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Meeting Title</Text>
                <TextInput value={editMeetTitle} onChangeText={setEditMeetTitle} placeholder="e.g. Sync & Sprint Review" placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <Text style={[styles.label, { color: theme.textSecondary }]}>Agenda Description</Text>
                <TextInput value={editMeetAgenda} onChangeText={setEditMeetAgenda} placeholder="Topics to cover..." placeholderTextColor={colors.text.tertiary} style={[styles.input, { color: theme.text, borderColor: theme.border }]} />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Meeting Date"
                      mode="date"
                      value={editMeetDate}
                      onChange={setEditMeetDate}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DateTimeField
                      label="Meeting Time"
                      mode="time"
                      value={editMeetDate}
                      onChange={setEditMeetDate}
                    />
                  </View>
                </View>

                <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: accentColor }]} onPress={handleSaveEditMeeting} disabled={updateMeetingMutation.isPending}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Changes</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED MEETING & MINUTES GEN MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedMeeting} onRequestClose={() => setSelectedMeeting(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedMeeting && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedMeeting.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
                        Scheduled: {new Date(selectedMeeting.date).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedMeeting) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditMeeting(selectedMeeting)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteMeeting(selectedMeeting.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedMeeting(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, marginTop: 15 }}>
                    {selectedMeeting.agenda && (
                      <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                        <Text style={{ fontWeight: 'bold', color: theme.text }}>Agenda: </Text>{selectedMeeting.agenda}
                      </Text>
                    )}

                    {/* AI Minutes Output block */}
                    {selectedMeeting.summary && (
                      <View style={[styles.detailAiSummary, { backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF', borderColor: isDark ? '#312E81' : '#E0E7FF', marginBottom: 20 }]}>
                        <Text style={{ fontWeight: 'bold', color: isDark ? '#C7D2FE' : '#4338CA', marginBottom: 6 }}>AI Summary</Text>
                        <Text style={{ fontSize: 13, lineHeight: 18, color: theme.textSecondary }}>{selectedMeeting.summary}</Text>
                        
                        {selectedMeeting.decisions && (
                          <View style={{ marginTop: 12 }}>
                            <Text style={{ fontWeight: 'bold', color: isDark ? '#C7D2FE' : '#4338CA', marginBottom: 4 }}>Decisions Made</Text>
                            <Text style={{ fontSize: 12, lineHeight: 18, color: theme.textSecondary }}>{selectedMeeting.decisions}</Text>
                          </View>
                        )}

                        {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <Text style={{ fontWeight: 'bold', color: isDark ? '#C7D2FE' : '#4338CA', marginBottom: 4 }}>Follow-up Action Items</Text>
                            {selectedMeeting.action_items.map((act, aIdx) => (
                              <Text key={aIdx} style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 3 }}>
                                • {act.task} (Assignee: {act.assignee || 'Unassigned'})
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {/* Generate Minutes form */}
                    {currentUserRole !== 'Viewer' && (
                      <View style={[styles.inviteCard, { backgroundColor: theme.background, borderColor: theme.border, marginBottom: 20 }]}>
                        <Text style={[styles.inviteLabel, { color: theme.text }]}>Write Meeting Notes & Generate AI Minutes</Text>
                        <TextInput
                          placeholder="Paste raw discussion sentences, decisions, and assignee names..."
                          placeholderTextColor={colors.text.tertiary}
                          value={meetNotesText}
                          onChangeText={setMeetNotesText}
                          multiline
                          numberOfLines={6}
                          style={[styles.input, styles.textArea, { color: theme.text, borderColor: theme.border, height: 100, marginBottom: 12 }]}
                        />
                        <TouchableOpacity
                          style={[styles.inviteBtnSubmit, { backgroundColor: accentColor }]}
                          onPress={triggerMinutesGeneration}
                          disabled={generatingMinutes}
                        >
                          {generatingMinutes ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Analyze & Generate Minutes with AI</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Meeting Comments feed */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedMeeting.comments || selectedMeeting.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedMeeting.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'meeting', selectedMeeting.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={meetCommentText}
                          onChangeText={setMeetCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentMeetingMutation.mutate({ meetingId: selectedMeeting.id, content: meetCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED GOAL & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedGoal} onRequestClose={() => setSelectedGoal(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedGoal && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedGoal.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Creator: {selectedGoal.creator_name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedGoal) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditGoal(selectedGoal)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteGoal(selectedGoal.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedGoal(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Progress</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.border, marginVertical: 10 }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: accentColor, width: `${selectedGoal.progress}%` }]} />
                    </View>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 15 }}>Progress Percent: {selectedGoal.progress}%</Text>

                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Milestones</Text>
                    {selectedGoal.milestones?.map((m, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.subtaskItemCheck}
                        disabled={currentUserRole === 'Viewer'}
                        onPress={() => {
                          triggerHaptic();
                          const updated = selectedGoal.milestones.map((ms, mIdx) =>
                            mIdx === idx ? { ...ms, completed: !ms.completed } : ms
                          );
                          toggleMilestoneMutation.mutate({ goalId: selectedGoal.id, milestones: updated });
                        }}
                      >
                        <Ionicons
                          name={m.completed ? 'checkmark-circle' : 'ellipse-outline'}
                          size={20}
                          color={m.completed ? accentColor : colors.text.tertiary}
                          style={{ marginRight: 8 }}
                        />
                        <Text style={[styles.milestoneText, { color: m.completed ? colors.text.tertiary : theme.text, textDecorationLine: m.completed ? 'line-through' : 'none' }]}>
                          {m.name}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Goal Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedGoal.comments || selectedGoal.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedGoal.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'goal', selectedGoal.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={goalCommentText}
                          onChangeText={setGoalCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentGoalMutation.mutate({ goalId: selectedGoal.id, content: goalCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED EVENT & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedEvent} onRequestClose={() => setSelectedEvent(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedEvent && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedEvent.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Creator: {selectedEvent.creator_name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedEvent) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditEvent(selectedEvent)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteEvent(selectedEvent.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedEvent(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
                      <Text style={{ fontWeight: 'bold' }}>Date: </Text>
                      {new Date(selectedEvent.date).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 15 }}>
                      <Text style={{ fontWeight: 'bold' }}>Type: </Text>
                      {selectedEvent.type}
                    </Text>
                    {selectedEvent.description && (
                      <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                        {selectedEvent.description}
                      </Text>
                    )}

                    {/* Event Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedEvent.comments || selectedEvent.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedEvent.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'event', selectedEvent.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={eventCommentText}
                          onChangeText={setEventCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentEventMutation.mutate({ eventId: selectedEvent.id, content: eventCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED DISCUSSION & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedDiscussion} onRequestClose={() => setSelectedDiscussion(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedDiscussion && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedDiscussion.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Author: {selectedDiscussion.author_name} • {selectedDiscussion.category}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedDiscussion) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditDiscussion(selectedDiscussion)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteDiscussion(selectedDiscussion.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedDiscussion(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                      {selectedDiscussion.content}
                    </Text>

                    {/* Reactions Row */}
                    <View style={[styles.reactionsRow, { marginVertical: 10 }]}>
                      {['👍', '❤️', '🔥', '💡', '🚀'].map((emoji) => {
                        const reactors = selectedDiscussion.reactions?.[emoji] || [];
                        const hasReacted = reactors.includes(currentUser?.id || 0);
                        return (
                          <TouchableOpacity
                            key={emoji}
                            style={[
                              styles.reactBtn,
                              {
                                backgroundColor: hasReacted ? `${accentColor}15` : (isDark ? '#334155' : '#F1F5F9'),
                                borderColor: hasReacted ? accentColor : 'transparent',
                              }
                            ]}
                            onPress={() => reactMutation.mutate({ discId: selectedDiscussion.id, emoji })}
                          >
                            <Text style={styles.reactEmoji}>{emoji}</Text>
                            <Text style={[styles.reactCount, { color: hasReacted ? accentColor : theme.textSecondary }]}>
                              {reactors.length}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Discussion Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedDiscussion.comments || selectedDiscussion.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedDiscussion.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'discussion', selectedDiscussion.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={discCommentText}
                          onChangeText={setDiscCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentDiscussionMutation.mutate({ discussionId: selectedDiscussion.id, content: discCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED KNOWLEDGE & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedKnowledge} onRequestClose={() => setSelectedKnowledge(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedKnowledge && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedKnowledge.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Author: {selectedKnowledge.author_name} • Category: {selectedKnowledge.category}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedKnowledge) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditKnowledge(selectedKnowledge)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteKnowledge(selectedKnowledge.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedKnowledge(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                      {selectedKnowledge.content}
                    </Text>

                    {/* Knowledge Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedKnowledge.comments || selectedKnowledge.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedKnowledge.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'knowledge', selectedKnowledge.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={knowCommentText}
                          onChangeText={setKnowCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentKnowledgeMutation.mutate({ knowledgeId: selectedKnowledge.id, content: knowCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── DETAILED BRAINSTORM IDEA & COMMENTS MODAL ── */}
      <Modal animationType="fade" transparent visible={!!selectedIdea} onRequestClose={() => setSelectedIdea(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          style={styles.fadeOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalTouchArea}>
              {selectedIdea && (
              <View style={[styles.detailModalContent, { backgroundColor: theme.card }]}>
                <View style={{ flex: 1, overflow: 'hidden' }}>
                  <View style={[styles.modalHeader, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailNoteTitle, { color: theme.text }]}>{selectedIdea.title}</Text>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Author: {selectedIdea.author_name} • Category: {selectedIdea.category}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {canEditOrDelete(selectedIdea) && (
                        <>
                          <TouchableOpacity
                            onPress={() => handleOpenEditIdea(selectedIdea)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="create-outline" size={22} color={accentColor} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteIdea(selectedIdea.id)}
                            style={{ marginRight: 15, padding: 4 }}
                          >
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => setSelectedIdea(null)} style={{ padding: 4 }}>
                        <Ionicons name="close" size={26} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1, paddingVertical: 15 }}>
                    <Text style={[styles.detailNoteBody, { color: theme.textSecondary, marginBottom: 15 }]}>
                      {selectedIdea.content}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 15 }}>
                      <Text style={{ fontWeight: 'bold' }}>Votes received: </Text>
                      {selectedIdea.votes?.length || 0}
                    </Text>

                    {/* Idea Comments */}
                    <Text style={[styles.commentsLabelTitle, { color: theme.text, marginTop: 20 }]}>Discussion & Feedback</Text>
                    <View style={styles.commentsList}>
                      {(!selectedIdea.comments || selectedIdea.comments.length === 0) && (
                        <Text style={[styles.emptyCommentsText, { color: colors.text.tertiary }]}>No comments yet. Start the discussion.</Text>
                      )}
                      {selectedIdea.comments?.map((c) => {
                        const canDeleteComment = c.user_id === currentUser?.id || currentUserRole === 'Owner' || currentUserRole === 'Admin';
                        return (
                          <View key={c.id} style={[styles.commentItemBox, { borderBottomColor: theme.border }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={[styles.commentAuthorName, { color: accentColor }]}>{c.full_name}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginRight: 8 }}>
                                  {new Date(c.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                {canDeleteComment && (
                                  <TouchableOpacity onPress={() => handleDeleteCommentGeneric(c.id, 'idea', selectedIdea.id)}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                            <Text style={[styles.commentText, { color: theme.text }]}>{c.content}</Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Comment Posting Input INSIDE SCROLLVIEW */}
                    <View style={[styles.commentInputBox, { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 15 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          placeholder="Write a comment response..."
                          placeholderTextColor={colors.text.tertiary}
                          value={ideaCommentText}
                          onChangeText={setIdeaCommentText}
                          style={[styles.commentTextInput, { color: theme.text, borderColor: theme.border, flex: 1 }]}
                        />
                        <TouchableOpacity
                          style={[styles.commentSendBtn, { backgroundColor: accentColor }]}
                          onPress={() => commentIdeaMutation.mutate({ ideaId: selectedIdea.id, content: ideaCommentText })}
                        >
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
      {toast && (
        <View style={styles.toastContainer}>
          <View style={[styles.toastBubble, { backgroundColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#F59E0B' }]}>
            <Ionicons name={toast.type === 'success' ? "checkmark-circle" : "alert-circle"} size={18} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 13 }}>{toast.message}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  headerDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiHeading: {
    fontSize: 32,
  },
  workspaceTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  workspaceMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    height: 48,
  },
  tabsScroll: {
    paddingHorizontal: 15,
    alignItems: 'center',
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  moduleContentScroll: {
    padding: 20,
    paddingBottom: 80,
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  noItemsText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 40,
    lineHeight: 20,
  },
  
  // NOTE CARDS
  noteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  smallBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  noteContentPreview: {
    fontSize: 14,
    lineHeight: 20,
  },
  aiSummaryBox: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  aiSummaryText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  noteCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  authorLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  commentsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // KANBAN TASKS
  kanbanScrollSelector: {
    flexDirection: 'column',
    gap: 20,
  },
  kanbanCol: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
  },
  kanbanColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  kanbanColTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  kanbanList: {
    gap: 10,
  },
  kanbanEmptyText: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10,
  },
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  taskCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  taskCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 100,
  },

  // GOALS
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  goalProgressContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalProgressPercent: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  milestoneList: {
    gap: 10,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // CALENDAR
  aiBtnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  aiBtnTextHeader: {
    fontSize: 12,
    fontWeight: '700',
  },
  conflictAlertCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  eventCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventTag: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  eventTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  eventDescText: {
    fontSize: 12,
    marginTop: 2,
  },
  eventRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  eventDateText: {
    fontSize: 11,
    fontWeight: 'bold',
  },

  // DISCUSSIONS
  discCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  discHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  discTitleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  discBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1.2,
  },
  reactEmoji: {
    fontSize: 14,
  },
  reactCount: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // KNOWLEDGE WALL
  treeOutputCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  knowCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  knowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  knowTitleText: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  knowBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  knowAuthor: {
    fontSize: 11,
    marginTop: 10,
  },

  // BRAINSTORM board
  stickiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stickyNote: {
    width: (width - 52) / 2,
    height: 160,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  stickyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  stickyContent: {
    fontSize: 12,
    lineHeight: 16,
    color: '#334155',
    marginVertical: 4,
  },
  stickyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyAuthor: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
  },
  stickyVote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stickyVoteCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF1744',
    marginLeft: 2,
  },

  // MEETINGS
  meetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 15,
  },
  meetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  meetTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  meetAgendaText: {
    fontSize: 13,
    marginTop: 10,
  },
  minutesBlock: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  minutesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  minutesSummaryText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // AI ASSISTANT PANEL
  chatContainer: {
    height: height * 0.55,
  },
  chatHistory: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
  },
  chatBubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 10,
    maxWidth: '85%',
  },
  chatUser: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  chatAI: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  chatLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  chatInputRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  chatSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ANALYTICS & LEADERBOARD
  championsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  champCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  champTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 6,
  },
  champName: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  champScore: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  leaderboardBox: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
  },
  tableColHeader: {
    fontSize: 12,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    width: 30,
  },
  rowText: {
    fontSize: 13,
  },

  // SETTINGS & MEMBERS
  inviteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 20,
  },
  inviteLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  rolePillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  inviteBtnSubmit: {
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersBox: {
    borderRadius: 16,
    borderWidth: 1,
  },
  memberRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleLabelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trashBtn: {
    padding: 4,
  },
  dangerBtn: {
    backgroundColor: '#EF4444',
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // TIMELINE
  timeline: {
    marginLeft: 10,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDotBox: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineTextMsg: {
    fontSize: 13,
    lineHeight: 18,
  },
  timelineDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  timelineTime: {
    fontSize: 10,
    marginTop: 4,
  },

  // UNIVERSAL FORMS
  scrollForm: {
    paddingBottom: 30,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubmitBtn: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  // DETAILS MODAL (FADE OVERLAY STYLE)
  fadeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 20,
  },
  detailModalContent: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  detailNoteTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailNoteBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailAiSummary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 15,
  },
  commentsLabelTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 25,
    marginBottom: 10,
  },
  commentsList: {
    gap: 0,
    marginBottom: 4,
  },
  emptyCommentsText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  commentItemBox: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 12,
  },
  commentAuthorName: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentText: {
    fontSize: 13,
    marginTop: 4,
  },
  commentInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 8,
  },
  commentTextInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 19,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  commentSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTouchArea: {
    flex: 1,
    justifyContent: 'center',
  },

  // MORE TASK CARD SPECIFICS
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusBtnSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  subtaskItemCheck: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTagBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsPillList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  // PICKERS
  pickerRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  prioritySelectorBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  milestonePreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  privacyInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  inviteSubLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  linkCodeText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  linkIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  joinBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  joinBannerText: {
    fontSize: 12,
  },
  joinBannerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBannerBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
