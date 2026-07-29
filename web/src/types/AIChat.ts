export interface AIChatMessage {
  id: number;
  user_id: number;
  message: string;
  response: string;
  created_at: string;
}

export interface AIChatRequest {
  message: string;
  context?: string | null;
  system_prompt?: string | null;
  is_temporary?: boolean;
}

export interface AIHistoryResponse {
  chats: AIChatMessage[];
  total: number;
}
