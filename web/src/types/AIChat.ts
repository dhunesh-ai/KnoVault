export interface AIConversationMessage {
  id: string;
  conversation_id: string;
  user_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AIConversationSummary {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string | null;
}

export interface AIConversation {
  id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  messages: AIConversationMessage[];
}

export interface AIChatRequest {
  conversation_id?: string | null;
  message: string;
  context?: string | null;
  system_prompt?: string | null;
  is_temporary?: boolean;
}

export interface AIChatResponse {
  id: string | number;
  conversation_id: string;
  message: string;
  response: string;
  title: string;
  user_message?: AIConversationMessage;
  assistant_message?: AIConversationMessage;
  created_at: string;
}

export interface AIChatMessage {
  id: string | number;
  user_id?: number;
  message: string;
  response: string;
  created_at: string;
}

export interface AIHistoryResponse {
  chats: AIChatMessage[];
  total: number;
}
