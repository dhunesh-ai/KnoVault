import client from './client';

export interface ChatResponse {
  id: number;
  message: string;
  response: string;
  created_at: string;
}

export interface AISuggestion {
  title: string;
  category: string;
}

export const aiApi = {
  /** Send message to AI Assistant */
  chat: async (message: string, context?: string, systemPrompt?: string): Promise<ChatResponse> => {
    const response = await client.post('/api/ai/chat', { 
      message,
      context,
      system_prompt: systemPrompt
    });
    return response.data;
  },

  /** Get chat history */
  getHistory: async (): Promise<{ chats: ChatResponse[], total: number }> => {
    const response = await client.get('/api/ai/history');
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
