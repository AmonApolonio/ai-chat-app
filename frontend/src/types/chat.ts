export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatStreamChunk {
  chunk: string;
  done: boolean;
  status?: 'researching' | 'streaming';
}
