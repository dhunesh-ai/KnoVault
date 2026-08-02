import client from './client';
import { deduplicatedGet } from './requestDeduplicator';

export interface ServerMessage {
  id: string;
  conversation_id: string;
  user_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ServerConversationSummary {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
}

export interface ServerConversation {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  messages: ServerMessage[];
}

export interface ChatResponse {
  id: string | number;
  conversation_id: string;
  message: string;
  response: string;
  title: string;
  user_message?: ServerMessage;
  assistant_message?: ServerMessage;
  created_at: string;
}

export interface AISuggestion {
  title: string;
  category: string;
}

export const aiApi = {
  /** Get all user conversations (Deduplicated GET) */
  getConversations: async (): Promise<ServerConversationSummary[]> => {
    const response = await deduplicatedGet('/api/ai/conversations');
    return response.data;
  },

  /** Create a new conversation */
  createConversation: async (title?: string): Promise<ServerConversation> => {
    const response = await client.post('/api/ai/conversations', { title });
    return response.data;
  },

  /** Get conversation with messages (Deduplicated GET) */
  getConversation: async (conversationId: string): Promise<ServerConversation> => {
    const response = await deduplicatedGet(`/api/ai/conversations/${conversationId}`);
    return response.data;
  },

  /** Update title or pin status */
  updateConversation: async (
    conversationId: string,
    data: { title?: string; is_pinned?: boolean }
  ): Promise<ServerConversation> => {
    const response = await client.patch(`/api/ai/conversations/${conversationId}`, data);
    return response.data;
  },

  /** Delete conversation */
  deleteConversation: async (conversationId: string): Promise<void> => {
    await client.delete(`/api/ai/conversations/${conversationId}`);
  },

  /** Send message to AI Assistant */
  chat: async (
    message: string,
    conversationId?: string | null,
    context?: string,
    systemPrompt?: string,
    isTemporary?: boolean,
    signal?: AbortSignal,
    clientMessageId?: string
  ): Promise<ChatResponse> => {
    const response = await client.post(
      '/api/ai/chat',
      {
        conversation_id: conversationId,
        message,
        context,
        system_prompt: systemPrompt,
        is_temporary: isTemporary,
        client_message_id: clientMessageId,
      },
      { signal }
    );
    return response.data;
  },

  /** Get chat history */
  getHistory: async (): Promise<{ chats: ChatResponse[]; total: number }> => {
    const response = await deduplicatedGet('/api/ai/history');
    return response.data;
  },

  /** Clear chat history */
  clearHistory: async (): Promise<void> => {
    await client.delete('/api/ai/history');
  },

  /** Suggest tasks based on context */
  suggestTasks: async (): Promise<{ suggestions: AISuggestion[] }> => {
    const response = await client.post('/api/ai/suggest-tasks');
    return response.data;
  },

  /** Summarize note content */
  summarizeNote: async (text?: string, note_id?: number): Promise<{ summary: string }> => {
    const response = await client.post('/api/ai/summarize', { text, note_id });
    return response.data;
  },
};
