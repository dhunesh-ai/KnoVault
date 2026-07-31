import { create } from "zustand";
import { aiService } from "@/services/ai";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  isPinned: boolean;
  createdAt: string;
}

interface ChatThreadsState {
  threads: Thread[];
  activeThreadId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  fetchThreads: () => Promise<void>;
  createThread: (title?: string) => Promise<string>;
  deleteThread: (id: string) => Promise<void>;
  renameThread: (id: string, newTitle: string) => Promise<void>;
  togglePinThread: (id: string) => Promise<void>;
  setActiveThreadId: (id: string | null) => Promise<void>;
  addMessage: (threadId: string, role: "user" | "assistant", content: string) => void;
  syncResponse: (conversationId: string, title: string, userMsg?: any, assistantMsg?: any) => void;
  setSearchQuery: (query: string) => void;
  exportThreadToMarkdown: (threadId: string) => string;
}

export const useChatThreadsStore = create<ChatThreadsState>((set, get) => ({
  threads: [],
  activeThreadId: null,
  searchQuery: "",
  isLoading: false,

  fetchThreads: async () => {
    try {
      const summaries = await aiService.getConversations();
      const currentThreads = get().threads;

      const activeId = get().activeThreadId;
      let activeMsgs: Message[] = [];
      if (activeId) {
        try {
          const activeConv = await aiService.getConversation(activeId);
          activeMsgs = activeConv.messages.map((m: any) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content ?? m.response ?? m.text ?? "",
            timestamp: m.created_at || m.timestamp || new Date().toISOString(),
          }));
        } catch (e) {
          console.warn("[useChatThreadsStore] Error fetching active thread messages:", e);
        }
      }

      const updatedThreads: Thread[] = summaries.map((s) => {
        const existing = currentThreads.find((t) => t.id === s.id);
        const msgs = s.id === activeId && activeMsgs.length > 0 ? activeMsgs : (existing ? existing.messages : []);
        return {
          id: s.id,
          title: s.title,
          isPinned: s.is_pinned,
          createdAt: s.created_at,
          messages: msgs,
        };
      });

      let nextActiveId = get().activeThreadId;
      if (!nextActiveId || !updatedThreads.some((t) => t.id === nextActiveId)) {
        nextActiveId = updatedThreads.length > 0 ? updatedThreads[0].id : null;
      }

      set({ threads: updatedThreads, activeThreadId: nextActiveId, isLoading: false });

      if (nextActiveId) {
        const activeThread = updatedThreads.find((t) => t.id === nextActiveId);
        if (!activeThread || activeThread.messages.length === 0) {
          await get().setActiveThreadId(nextActiveId);
        }
      }
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to fetch conversations:", error);
      set({ isLoading: false });
    }
  },

  createThread: async (title = "New Conversation") => {
    try {
      const serverConv = await aiService.createConversation(title);
      const newThread: Thread = {
        id: serverConv.id,
        title: serverConv.title,
        isPinned: serverConv.is_pinned,
        createdAt: serverConv.created_at,
        messages: [],
      };

      set((state) => ({
        threads: [newThread, ...state.threads.filter((t) => t.id !== newThread.id)],
        activeThreadId: newThread.id,
      }));

      return newThread.id;
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to create thread:", error);
      const fallbackId = `conv_${Date.now()}`;
      return fallbackId;
    }
  },

  deleteThread: async (id: string) => {
    try {
      await aiService.deleteConversation(id);
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to delete conversation on server:", error);
    }

    set((state) => {
      const nextThreads = state.threads.filter((t) => t.id !== id);
      let nextActiveId = state.activeThreadId;
      if (state.activeThreadId === id) {
        nextActiveId = nextThreads.length > 0 ? nextThreads[0].id : null;
      }
      return {
        threads: nextThreads,
        activeThreadId: nextActiveId,
      };
    });

    const activeId = get().activeThreadId;
    if (activeId) {
      get().setActiveThreadId(activeId);
    }
  },

  renameThread: async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim() || "Untitled Chat";
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, title: trimmed } : t)),
    }));

    try {
      await aiService.updateConversation(id, { title: trimmed });
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to rename conversation on server:", error);
    }
  },

  togglePinThread: async (id: string) => {
    const thread = get().threads.find((t) => t.id === id);
    if (!thread) return;

    const newPinned = !thread.isPinned;
    set((state) => ({
      threads: state.threads
        .map((t) => (t.id === id ? { ...t, isPinned: newPinned } : t))
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
    }));

    try {
      await aiService.updateConversation(id, { is_pinned: newPinned });
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to update pin status on server:", error);
    }
  },

  setActiveThreadId: async (id: string | null) => {
    set({ activeThreadId: id });
    if (!id) return;

    try {
      const fullConv = await aiService.getConversation(id);
      const loadedMessages: Message[] = fullConv.messages.map((m: any) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content ?? m.response ?? m.text ?? "",
        timestamp: m.created_at || m.timestamp || new Date().toISOString(),
      }));

      set((state) => ({
        threads: state.threads.map((t) =>
          t.id === id ? { ...t, title: fullConv.title, isPinned: fullConv.is_pinned, messages: loadedMessages } : t
        ),
      }));
    } catch (error) {
      console.error("[useChatThreadsStore] Failed to fetch thread details:", error);
    }
  },

  addMessage: (threadId: string, role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      threads: state.threads.map((t) => {
        if (t.id === threadId) {
          return {
            ...t,
            messages: [...t.messages, newMessage],
          };
        }
        return t;
      }),
    }));
  },

  syncResponse: (conversationId: string, title: string, userMsg?: any, assistantMsg?: any, responseText?: string) => {
    set((state) => {
      let found = false;
      const extractUserContent = (u: any) => typeof u === "string" ? u : (u?.content ?? u?.message ?? u?.text ?? "");
      const extractAssistantContent = (a: any) => typeof a === "string" ? a : (a?.content ?? a?.response ?? a?.text ?? responseText ?? "");

      const updated = state.threads.map((t) => {
        if (t.id === conversationId) {
          found = true;
          // Filter out temporary optimistically added messages
          const cleanMsgs = t.messages.filter((m) => !m.id.startsWith("temp_"));
          if (userMsg) {
            cleanMsgs.push({
              id: userMsg.id || `user_${Date.now()}`,
              role: "user",
              content: extractUserContent(userMsg),
              timestamp: userMsg.created_at || userMsg.timestamp || new Date().toISOString(),
            });
          }
          const asstContent = extractAssistantContent(assistantMsg);
          if (asstContent || assistantMsg) {
            cleanMsgs.push({
              id: assistantMsg?.id || `asst_${Date.now()}`,
              role: "assistant",
              content: asstContent,
              timestamp: assistantMsg?.created_at || assistantMsg?.timestamp || new Date().toISOString(),
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
        // Conversation was newly created by server
        const newMsgs: Message[] = [];
        if (userMsg) {
          newMsgs.push({
            id: userMsg.id || `user_${Date.now()}`,
            role: "user",
            content: extractUserContent(userMsg),
            timestamp: userMsg.created_at || userMsg.timestamp || new Date().toISOString(),
          });
        }
        const asstContent = extractAssistantContent(assistantMsg);
        if (asstContent || assistantMsg) {
          newMsgs.push({
            id: assistantMsg?.id || `asst_${Date.now()}`,
            role: "assistant",
            content: asstContent,
            timestamp: assistantMsg?.created_at || assistantMsg?.timestamp || new Date().toISOString(),
          });
        }
        updated.unshift({
          id: conversationId,
          title: title || "New Conversation",
          isPinned: false,
          createdAt: new Date().toISOString(),
          messages: newMsgs,
        });
      }

      return {
        threads: updated,
        activeThreadId: conversationId,
      };
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  exportThreadToMarkdown: (threadId) => {
    const thread = get().threads.find((t) => t.id === threadId);
    if (!thread) return "";

    let md = `# ${thread.title}\n\n`;
    md += `*Exported from KnoVault AI on ${new Date().toLocaleString()}*\n\n---\n\n`;

    thread.messages.forEach((msg) => {
      const sender = msg.role === "user" ? "User" : "KnoVault AI";
      md += `### **${sender}** *(${new Date(msg.timestamp).toLocaleTimeString()})*\n\n`;
      md += `${msg.content}\n\n---\n\n`;
    });

    return md;
  },
}));
