import { create } from "zustand";
import { persist } from "zustand/middleware";

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

  // Actions
  createThread: (title?: string) => string;
  deleteThread: (id: string) => void;
  renameThread: (id: string, newTitle: string) => void;
  togglePinThread: (id: string) => void;
  setActiveThreadId: (id: string | null) => void;
  addMessage: (threadId: string, role: "user" | "assistant", content: string) => void;
  setSearchQuery: (query: string) => void;
  exportThreadToMarkdown: (threadId: string) => string;
}

export const useChatThreadsStore = create<ChatThreadsState>()(
  persist(
    (set, get) => ({
      threads: [],
      activeThreadId: null,
      searchQuery: "",

      createThread: (title = "New Conversation") => {
        const newId = `thread_${Date.now()}`;
        const newThread: Thread = {
          id: newId,
          title,
          messages: [],
          isPinned: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          threads: [newThread, ...state.threads],
          activeThreadId: newId,
        }));

        return newId;
      },

      deleteThread: (id) => {
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
      },

      renameThread: (id, newTitle) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === id ? { ...t, title: newTitle.trim() || "Untitled Chat" } : t
          ),
        }));
      },

      togglePinThread: (id) => {
        set((state) => ({
          threads: state.threads.map((t) =>
            t.id === id ? { ...t, isPinned: !t.isPinned } : t
          ).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }),
        }));
      },

      setActiveThreadId: (id) => {
        set({ activeThreadId: id });
      },

      addMessage: (threadId, role, content) => {
        const newMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role,
          content,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          threads: state.threads.map((t) => {
            if (t.id === threadId) {
              const updatedMessages = [...t.messages, newMessage];
              // Automatically rename the thread if it has only one user message
              let newTitle = t.title;
              if (t.title === "New Conversation" && role === "user") {
                newTitle = content.length > 30 ? content.substring(0, 30) + "..." : content;
              }
              return {
                ...t,
                messages: updatedMessages,
                title: newTitle,
              };
            }
            return t;
          }),
        }));
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
    }),
    {
      name: "knovault-chat-threads",
    }
  )
);
