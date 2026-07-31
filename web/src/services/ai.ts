import api from "@/lib/axios";
import {
  AIChatRequest,
  AIChatResponse,
  AIConversation,
  AIConversationSummary,
  AIHistoryResponse,
} from "@/types/AIChat";

export const aiService = {
  getConversations: async () => {
    const response = await api.get<AIConversationSummary[]>("/api/ai/conversations");
    return response.data;
  },

  createConversation: async (title?: string) => {
    const response = await api.post<AIConversation>("/api/ai/conversations", { title });
    return response.data;
  },

  getConversation: async (conversationId: string) => {
    const response = await api.get<AIConversation>(`/api/ai/conversations/${conversationId}`);
    return response.data;
  },

  updateConversation: async (conversationId: string, data: { title?: string; is_pinned?: boolean }) => {
    const response = await api.patch<AIConversation>(`/api/ai/conversations/${conversationId}`, data);
    return response.data;
  },

  deleteConversation: async (conversationId: string) => {
    await api.delete(`/api/ai/conversations/${conversationId}`);
  },

  chat: async (data: AIChatRequest, signal?: AbortSignal) => {
    const response = await api.post<AIChatResponse>("/api/ai/chat", data, { signal });
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
  },
};
