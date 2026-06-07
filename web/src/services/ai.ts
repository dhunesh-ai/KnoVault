import api from "@/lib/axios";
import { AIChatMessage, AIChatRequest, AIHistoryResponse } from "@/types/AIChat";

export const aiService = {
  chat: async (data: AIChatRequest) => {
    const response = await api.post<AIChatMessage>("/api/ai/chat", data);
    return response.data;
  },

  getHistory: async (params?: { skip?: number; limit?: number }) => {
    const response = await api.get<AIHistoryResponse>("/api/ai/history", { params });
    return response.data;
  },

  clearHistory: async () => {
    await api.delete("/api/ai/history");
  },
  
  getSuggestions: async () => {
    const response = await api.post<{ suggestions: string[] }>("/api/ai/suggest-tasks");
    return response.data.suggestions;
  }
};
