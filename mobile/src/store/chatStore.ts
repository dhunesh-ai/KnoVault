import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';
import { aiApi } from '../api/ai';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO String
  isStreaming?: boolean;
  isError?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string; // ISO String
  messages: Message[];
}

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  isLoading: boolean;
  searchQuery: string;

  isTemporaryChat: boolean;
  temporaryMessages: Message[];

  // Actions
  loadThreads: () => Promise<void>;
  createThread: (initialMessage?: string) => Promise<string>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  togglePinThread: (threadId: string) => Promise<void>;
  setActiveThread: (threadId: string | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  addMessage: (threadId: string, message: Omit<Message, 'timestamp'>) => Promise<void>;
  syncResponse: (conversationId: string, title: string, userMsg?: any, assistantMsg?: any) => Promise<void>;
  updateMessage: (threadId: string, messageId: string, updates: Partial<Message>) => Promise<void>;
  clearActiveThreadMessages: () => Promise<void>;
  exportThreadMarkdown: (threadId: string) => Promise<void>;

  // Temporary Chat Actions
  setTemporaryChat: (enabled: boolean) => void;
  addTemporaryMessage: (message: Omit<Message, 'timestamp'>) => void;
  updateTemporaryMessage: (messageId: string, updates: Partial<Message>) => void;
  clearTemporaryMessages: () => void;
}

const FILE_PATH = `${(FileSystem as any).documentDirectory || ''}knovault_chat_threads.json`;

const saveThreadsToFile = async (threads: ChatThread[]) => {
  try {
    await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(threads), {
      encoding: 'utf8',
    });
  } catch (error) {
    console.error('[ChatStore] Failed to save threads to file:', error);
  }
};

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  isLoading: true,
  searchQuery: '',
  isTemporaryChat: false,
  temporaryMessages: [],

  loadThreads: async () => {
    try {
      // 1. Fetch conversations from server
      const summaries = await aiApi.getConversations();
      const localThreads = get().threads;

      const activeId = get().activeThreadId;
      let activeMsgs: Message[] = [];
      if (activeId) {
        try {
          const activeConv = await aiApi.getConversation(activeId);
          activeMsgs = activeConv.messages.map((m) => ({
            id: m.id,
            sender: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: m.created_at,
          }));
        } catch (e) {
          console.warn('[ChatStore] Error fetching active thread messages:', e);
        }
      }

      const updatedThreads: ChatThread[] = summaries.map((s) => {
        const existing = localThreads.find((t) => t.id === s.id);
        const msgs = s.id === activeId && activeMsgs.length > 0 ? activeMsgs : (existing ? existing.messages : []);
        return {
          id: s.id,
          title: s.title,
          isPinned: s.is_pinned,
          createdAt: s.created_at,
          messages: msgs,
        };
      });

      // Sort: Pinned first, then by date descending
      const sortedThreads = [...updatedThreads].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      let nextActiveId = get().activeThreadId;
      if (!nextActiveId || !sortedThreads.some((t) => t.id === nextActiveId)) {
        nextActiveId = sortedThreads.length > 0 ? sortedThreads[0].id : null;
      }

      set({
        threads: sortedThreads,
        activeThreadId: nextActiveId,
        isLoading: false,
      });

      await saveThreadsToFile(sortedThreads);

      if (nextActiveId) {
        const activeThread = sortedThreads.find((t) => t.id === nextActiveId);
        if (!activeThread || activeThread.messages.length === 0) {
          await get().setActiveThread(nextActiveId);
        }
      }
    } catch (error) {
      console.warn('[ChatStore] Server fetch failed, loading local file cache:', error);
      try {
        const fileInfo = await FileSystem.getInfoAsync(FILE_PATH);
        if (fileInfo.exists) {
          const fileContent = await FileSystem.readAsStringAsync(FILE_PATH, {
            encoding: 'utf8',
          });
          const cachedThreads = JSON.parse(fileContent) as ChatThread[];
          const sorted = [...cachedThreads].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

          set({
            threads: sorted,
            activeThreadId: sorted.length > 0 ? sorted[0].id : null,
            isLoading: false,
          });
        } else {
          set({ threads: [], activeThreadId: null, isLoading: false });
        }
      } catch (fileErr) {
        console.error('[ChatStore] Failed to read local cache:', fileErr);
        set({ threads: [], activeThreadId: null, isLoading: false });
      }
    }
  },

  createThread: async (initialMessage) => {
    try {
      const serverConv = await aiApi.createConversation(initialMessage);
      const newThread: ChatThread = {
        id: serverConv.id,
        title: serverConv.title,
        isPinned: serverConv.is_pinned,
        createdAt: serverConv.created_at,
        messages: [],
      };

      const updatedThreads = [newThread, ...get().threads.filter((t) => t.id !== newThread.id)];
      set({ threads: updatedThreads, activeThreadId: newThread.id });
      await saveThreadsToFile(updatedThreads);
      return newThread.id;
    } catch (error) {
      console.error('[ChatStore] Failed to create thread on server:', error);
      const newId = `thread_${Date.now()}`;
      const newThread: ChatThread = {
        id: newId,
        title: initialMessage
          ? initialMessage.length > 25
            ? `${initialMessage.substring(0, 25)}...`
            : initialMessage
          : 'New Conversation',
        isPinned: false,
        createdAt: new Date().toISOString(),
        messages: [],
      };
      const updatedThreads = [newThread, ...get().threads];
      set({ threads: updatedThreads, activeThreadId: newId });
      await saveThreadsToFile(updatedThreads);
      return newId;
    }
  },

  deleteThread: async (threadId) => {
    try {
      await aiApi.deleteConversation(threadId);
    } catch (error) {
      console.error('[ChatStore] Server delete failed:', error);
    }

    const updatedThreads = get().threads.filter((t) => t.id !== threadId);
    let nextActiveId = get().activeThreadId;
    if (nextActiveId === threadId) {
      nextActiveId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
    }
    set({ threads: updatedThreads, activeThreadId: nextActiveId });
    await saveThreadsToFile(updatedThreads);

    if (nextActiveId) {
      get().setActiveThread(nextActiveId);
    }
  },

  renameThread: async (threadId, newTitle) => {
    const trimmed = newTitle.trim() || 'Untitled Chat';
    const updatedThreads = get().threads.map((t) =>
      t.id === threadId ? { ...t, title: trimmed } : t
    );
    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);

    try {
      await aiApi.updateConversation(threadId, { title: trimmed });
    } catch (error) {
      console.error('[ChatStore] Server rename failed:', error);
    }
  },

  togglePinThread: async (threadId) => {
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread) return;

    const newPinned = !thread.isPinned;
    const updatedThreads = get().threads.map((t) =>
      t.id === threadId ? { ...t, isPinned: newPinned } : t
    );
    const sortedThreads = [...updatedThreads].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    set({ threads: sortedThreads });
    await saveThreadsToFile(sortedThreads);

    try {
      await aiApi.updateConversation(threadId, { is_pinned: newPinned });
    } catch (error) {
      console.error('[ChatStore] Server pin toggle failed:', error);
    }
  },

  setActiveThread: async (threadId) => {
    set({ activeThreadId: threadId });
    if (!threadId) return;

    try {
      const fullConv = await aiApi.getConversation(threadId);
      const loadedMsgs: Message[] = fullConv.messages.map((m) => ({
        id: m.id,
        sender: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
        timestamp: m.created_at,
      }));

      const updatedThreads = get().threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              title: fullConv.title,
              isPinned: fullConv.is_pinned,
              messages: loadedMsgs,
            }
          : t
      );

      set({ threads: updatedThreads });
      await saveThreadsToFile(updatedThreads);
    } catch (error) {
      console.error('[ChatStore] Failed to fetch full conversation messages:', error);
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  addMessage: async (threadId, msg) => {
    const fullMessage: Message = {
      ...msg,
      timestamp: new Date().toISOString(),
    };

    const updatedThreads = get().threads.map((t) => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: [...t.messages, fullMessage],
        };
      }
      return t;
    });

    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);
  },

  syncResponse: async (conversationId, title, userMsg, assistantMsg) => {
    let found = false;
    const currentThreads = get().threads;

    const updated = currentThreads.map((t) => {
      if (t.id === conversationId) {
        found = true;
        const cleanMsgs = t.messages.filter((m) => !m.id.startsWith('temp_'));
        if (userMsg) {
          cleanMsgs.push({
            id: userMsg.id,
            sender: 'user',
            content: userMsg.content,
            timestamp: userMsg.created_at,
          });
        }
        if (assistantMsg) {
          cleanMsgs.push({
            id: assistantMsg.id,
            sender: 'assistant',
            content: assistantMsg.content,
            timestamp: assistantMsg.created_at,
          });
        }
        return {
          ...t,
          title: title || t.title,
          messages: cleanMsgs,
        };
      }
      return t;
    });

    if (!found) {
      const newMsgs: Message[] = [];
      if (userMsg) {
        newMsgs.push({
          id: userMsg.id,
          sender: 'user',
          content: userMsg.content,
          timestamp: userMsg.created_at,
        });
      }
      if (assistantMsg) {
        newMsgs.push({
          id: assistantMsg.id,
          sender: 'assistant',
          content: assistantMsg.content,
          timestamp: assistantMsg.created_at,
        });
      }
      updated.unshift({
        id: conversationId,
        title: title || 'New Conversation',
        isPinned: false,
        createdAt: new Date().toISOString(),
        messages: newMsgs,
      });
    }

    set({ threads: updated, activeThreadId: conversationId });
    await saveThreadsToFile(updated);
  },

  updateMessage: async (threadId, messageId, updates) => {
    const updatedThreads = get().threads.map((t) => {
      if (t.id === threadId) {
        return {
          ...t,
          messages: t.messages.map((m) => (m.id === messageId ? { ...m, ...updates } : m)),
        };
      }
      return t;
    });

    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);
  },

  clearActiveThreadMessages: async () => {
    const activeId = get().activeThreadId;
    if (!activeId) return;

    const updatedThreads = get().threads.map((t) =>
      t.id === activeId ? { ...t, messages: [] } : t
    );

    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);
  },

  exportThreadMarkdown: async (threadId) => {
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread || thread.messages.length === 0) return;

    let md = `# KnoVault AI Conversation: ${thread.title}\n`;
    md += `Date: ${new Date(thread.createdAt).toLocaleDateString()}\n\n`;
    md += `---\n\n`;

    thread.messages.forEach((msg) => {
      const role = msg.sender === 'user' ? 'User' : 'KnoVault AI';
      const time = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      md += `### **${role}** _(${time})_\n\n${msg.content}\n\n`;
      md += `---\n\n`;
    });

    try {
      await Share.share({
        title: `Exported Chat: ${thread.title}`,
        message: md,
      });
    } catch (error) {
      console.error('[ChatStore] Failed to share/export chat:', error);
    }
  },

  setTemporaryChat: (enabled) => {
    set({ isTemporaryChat: enabled });
    if (enabled) {
      set({ temporaryMessages: [] });
    }
  },

  addTemporaryMessage: (msg) => {
    const fullMessage: Message = {
      ...msg,
      timestamp: new Date().toISOString(),
    };
    set({ temporaryMessages: [...get().temporaryMessages, fullMessage] });
  },

  updateTemporaryMessage: (messageId, updates) => {
    const updated = get().temporaryMessages.map((m) =>
      m.id === messageId ? { ...m, ...updates } : m
    );
    set({ temporaryMessages: updated });
  },

  clearTemporaryMessages: () => {
    set({ temporaryMessages: [] });
  },
}));
