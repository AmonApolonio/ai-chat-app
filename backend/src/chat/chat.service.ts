import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ChatRequestDto, ChatStreamChunkDto } from './dto/chat.dto';
import { AgentService } from './services/agent.service';
import { HumanMessage } from "@langchain/core/messages";

@Injectable()
export class ChatService {
  private chatHistory: Map<string, HumanMessage[]> = new Map();
  constructor(
    private readonly agentService: AgentService
  ) {}
  async streamResponse(chatRequest: ChatRequestDto, response: Response, abortSignal?: AbortSignal): Promise<void> {
    // Get or create conversation history
    const sessionId = chatRequest.sessionId || 'default';
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    const history = this.chatHistory.get(sessionId) || [];
    // Add user message to history
    const userMessage = new HumanMessage(chatRequest.message);
    history.push(userMessage);
    // Set up abort flag
    let isAborted = false;
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        isAborted = true;
      });
    }
    try {
      // Use the agent to stream the response with abort signal
      await this.agentService.streamResponse(
        chatRequest.message,
        history,
        (chunk: string, done: boolean, status?: 'researching' | 'streaming') => {
          if (isAborted) return;
          const chunkData: ChatStreamChunkDto = { chunk, done, status };
          const eventData = `data: ${JSON.stringify(chunkData)}\n\n`;
          response.write(eventData);
          if (done) {
            response.end();
          }
        },
        abortSignal
      );
      if (!isAborted) {
        this.chatHistory.set(sessionId, history);
      }
    } catch (error) {
      if (isAborted) return;
      const errorResponse = {
        chunk: `Error: ${error.message || 'An unknown error occurred'}`,
        done: true
      };
      response.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      response.end();
    }
  }
}
