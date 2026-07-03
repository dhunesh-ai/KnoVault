import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

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
  setActiveThread: (threadId: string | null) => void;
  setSearchQuery: (query: string) => void;
  addMessage: (threadId: string, message: Omit<Message, 'timestamp'>) => Promise<void>;
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
    set({ isLoading: true });
    try {
      const fileInfo = await FileSystem.getInfoAsync(FILE_PATH);
      if (fileInfo.exists) {
        const fileContent = await FileSystem.readAsStringAsync(FILE_PATH, {
          encoding: 'utf8',
        });
        const threads = JSON.parse(fileContent) as ChatThread[];
        // Sort: Pinned first, then by date descending
        const sortedThreads = [...threads].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        set({ 
          threads: sortedThreads, 
          activeThreadId: sortedThreads.length > 0 ? sortedThreads[0].id : null,
          isLoading: false 
        });
      } else {
        set({ threads: [], activeThreadId: null, isLoading: false });
      }
    } catch (error) {
      console.error('[ChatStore] Failed to load threads:', error);
      set({ threads: [], activeThreadId: null, isLoading: false });
    }
  },

  createThread: async (initialMessage) => {
    const newId = `thread_${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: initialMessage ? (initialMessage.length > 25 ? `${initialMessage.substring(0, 25)}...` : initialMessage) : 'New Conversation',
      isPinned: false,
      createdAt: new Date().toISOString(),
      messages: [],
    };

    const updatedThreads = [newThread, ...get().threads];
    set({ threads: updatedThreads, activeThreadId: newId });
    await saveThreadsToFile(updatedThreads);
    return newId;
  },

  deleteThread: async (threadId) => {
    const updatedThreads = get().threads.filter((t) => t.id !== threadId);
    let nextActiveId = get().activeThreadId;
    if (nextActiveId === threadId) {
      nextActiveId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
    }
    set({ threads: updatedThreads, activeThreadId: nextActiveId });
    await saveThreadsToFile(updatedThreads);
  },

  renameThread: async (threadId, newTitle) => {
    const updatedThreads = get().threads.map((t) => 
      t.id === threadId ? { ...t, title: newTitle.trim() || 'Untitled Chat' } : t
    );
    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);
  },

  togglePinThread: async (threadId) => {
    const updatedThreads = get().threads.map((t) => 
      t.id === threadId ? { ...t, isPinned: !t.isPinned } : t
    );
    // Resort: Pinned first, then by date descending
    const sortedThreads = [...updatedThreads].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    set({ threads: sortedThreads });
    await saveThreadsToFile(sortedThreads);
  },

  setActiveThread: (threadId) => {
    set({ activeThreadId: threadId });
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
        // If thread is named "New Conversation" and user sent the message, auto-name it
        let newTitle = t.title;
        if (t.title === 'New Conversation' && msg.sender === 'user') {
          newTitle = msg.content.length > 25 ? `${msg.content.substring(0, 25)}...` : msg.content;
        }
        return {
          ...t,
          title: newTitle,
          messages: [...t.messages, fullMessage],
        };
      }
      return t;
    });

    set({ threads: updatedThreads });
    await saveThreadsToFile(updatedThreads);
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
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
