export enum ChatMode {
  RESEARCH = 'research',
  PDF = 'pdf'
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  isBeingFormatted?: boolean;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  mode?: ChatMode;
}

export interface ChatStreamChunk {
  chunk: string;
  done: boolean;
  status?: 'researching' | 'streaming' | 'streaming-complete' | 'formatted-complete';
  error?: boolean;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
}
