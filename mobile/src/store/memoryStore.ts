import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: string;
}

interface MemoryState {
  memories: MemoryItem[];
  isLoading: boolean;

  // Actions
  loadMemories: () => Promise<void>;
  addMemory: (text: string) => Promise<void>;
  editMemory: (id: string, newText: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  clearAllMemories: () => Promise<void>;
  getMemoryContextString: () => string;
}

const SECURE_STORE_KEY = 'knovault_ai_memories';

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  isLoading: true,

  loadMemories: async () => {
    set({ isLoading: true });
    try {
      const stored = await SecureStore.getItemAsync(SECURE_STORE_KEY);
      if (stored) {
        set({ memories: JSON.parse(stored) as MemoryItem[], isLoading: false });
      } else {
        // Seed default memories if empty (e.g. read user name from profile if available, or just empty)
        const defaults: MemoryItem[] = [
          { id: 'mem_1', text: 'User name is Guest user', createdAt: new Date().toISOString() },
        ];
        set({ memories: defaults, isLoading: false });
        await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(defaults));
      }
    } catch (error) {
      console.error('[MemoryStore] Failed to load memories:', error);
      set({ memories: [], isLoading: false });
    }
  },

  addMemory: async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const newItem: MemoryItem = {
      id: `mem_${Date.now()}`,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    const updated = [newItem, ...get().memories];
    set({ memories: updated });
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[MemoryStore] Failed to save memories:', e);
    }
  },

  editMemory: async (id, newText) => {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const updated = get().memories.map((m) => 
      m.id === id ? { ...m, text: trimmed } : m
    );

    set({ memories: updated });
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[MemoryStore] Failed to edit memories:', e);
    }
  },

  deleteMemory: async (id) => {
    const updated = get().memories.filter((m) => m.id !== id);
    set({ memories: updated });
    try {
      await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('[MemoryStore] Failed to delete memory:', e);
    }
  },

  clearAllMemories: async () => {
    set({ memories: [] });
    try {
      await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    } catch (e) {
      console.error('[MemoryStore] Failed to clear memories:', e);
    }
  },

  getMemoryContextString: () => {
    const list = get().memories;
    if (list.length === 0) return '';
    
    let context = 'USER MEMORY AND PREFERENCES (Always keep these in mind when answering):\n';
    list.forEach((item) => {
      context += `- ${item.text}\n`;
    });
    return context;
  },
}));
