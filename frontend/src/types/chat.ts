export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
}
