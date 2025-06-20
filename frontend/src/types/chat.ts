export enum ChatMode {
  RESEARCH = 'research',
  PDF = 'pdf'
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  mode?: ChatMode;
}

export interface ChatStreamChunk {
  chunk: string;
  done: boolean;
  status?: 'researching' | 'streaming';
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
}
