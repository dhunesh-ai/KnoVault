import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface MemoryItem {
  id: string;
  content: string;
  createdAt: string;
}

interface MemoryState {
  memories: MemoryItem[];

  // Actions
  addMemory: (content: string) => void;
  deleteMemory: (id: string) => void;
  updateMemory: (id: string, newContent: string) => void;
  clearMemories: () => void;
  getFormattedContext: () => string;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [
        { id: "mem_1", content: "You prefer concise, summary-first explanations.", createdAt: new Date().toISOString() },
        { id: "mem_2", content: "You work mostly on web development tasks.", createdAt: new Date().toISOString() }
      ],

      addMemory: (content) => {
        const newItem: MemoryItem = {
          id: `mem_${Date.now()}`,
          content: content.trim(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          memories: [...state.memories, newItem],
        }));
      },

      deleteMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
      },

      updateMemory: (id, newContent) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, content: newContent.trim() } : m
          ),
        }));
      },

      clearMemories: () => set({ memories: [] }),

      getFormattedContext: () => {
        const list = get().memories;
        if (list.length === 0) return "";
        return `User Preferences & Background Memory:\n` + list.map(m => `- ${m.content}`).join("\n") + "\n";
      }
    }),
    {
      name: "knovault-ai-profile-memories",
    }
  )
);
