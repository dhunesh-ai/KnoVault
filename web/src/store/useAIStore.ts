/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { AIChatMessage } from "@/types/AIChat";
import { aiService } from "@/services/ai";

export type MascotState = "idle" | "thinking" | "success" | "reminder" | "birthday" | "medicine";

interface AIState {
  history: AIChatMessage[];
  suggestions: string[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  mascotState: MascotState;
  setMascotState: (state: MascotState) => void;
  fetchHistory: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  sendMessage: (message: string, context?: string) => Promise<AIChatMessage>;
  clearHistory: () => Promise<void>;
}

export const useAIStore = create<AIState>((set, get) => ({
  history: [],
  suggestions: [],
  isLoading: false,
  isSending: false,
  error: null,
  mascotState: "idle",

  setMascotState: (state) => set({ mascotState: state }),

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await aiService.getHistory();
      set({ history: response.chats, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch chat history", isLoading: false });
    }
  },
  
  fetchSuggestions: async () => {
    try {
      const suggestions = await aiService.getSuggestions();
      // Safely map suggestions in case the backend returns objects instead of strings
      const safeSuggestions = Array.isArray(suggestions) 
        ? suggestions.map(s => typeof s === 'string' ? s : (s as any).title || "Suggested Task")
        : ["What's my schedule today?", "Any upcoming birthdays?", "Did I take my medicine?"];
      set({ suggestions: safeSuggestions });
    } catch (e) {
      // Graceful fallback
      set({ suggestions: ["What's my schedule today?", "Any upcoming birthdays?", "Did I take my medicine?"] });
    }
  },

  sendMessage: async (message, context) => {
    set({ isSending: true, error: null, mascotState: "thinking" });
    try {
      // Optimistically add user message (response will be empty temporarily)
      const tempId = Date.now();
      const tempMessage: AIChatMessage = {
        id: tempId,
        user_id: 0, // Ignored
        message,
        response: "",
        created_at: new Date().toISOString()
      };
      
      set((state) => ({ history: [...state.history, tempMessage] }));

      const response = await aiService.chat({ message, context });
      
      // Update with actual response
      set((state) => ({
        history: state.history.map(h => h.id === tempId ? response : h),
        isSending: false,
        mascotState: "success"
      }));
      
      // Reset mascot after 3s
      setTimeout(() => {
        if (get().mascotState === "success") {
          set({ mascotState: "idle" });
        }
      }, 3000);
      
      return response;
    } catch (error) {
      // Remove temp message
      set((state) => ({
        history: state.history.filter(h => h.response !== ""),
        error: error instanceof Error ? error.message : "Failed to send message", 
        isSending: false,
        mascotState: "idle"
      }));
      throw error;
    }
  },

  clearHistory: async () => {
    set({ error: null });
    try {
      await aiService.clearHistory();
      set({ history: [] });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to clear history" });
      throw error;
    }
  },
}));
