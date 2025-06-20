import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ChatRequestDto, ChatResponseDto, ChatStreamChunkDto } from './dto/chat.dto';
import { AgentService } from './services/agent.service';
import { HumanMessage } from "@langchain/core/messages";

@Injectable()
export class ChatService {
  private chatHistory: Map<string, HumanMessage[]> = new Map();
    constructor(
    private readonly agentService: AgentService
  ) {}

  async streamResponse(chatRequest: ChatRequestDto, response: Response): Promise<void> {
    // Get or create conversation history
    const sessionId = chatRequest.sessionId || 'default';
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    
    const history = this.chatHistory.get(sessionId) || [];
    
    // Add user message to history
    const userMessage = new HumanMessage(chatRequest.message);
    history.push(userMessage);
    
    try {
      // Use the agent to stream the response
      await this.agentService.streamResponse(chatRequest.message, history, (chunk: string, done: boolean) => {
        // Send each chunk as an SSE event
        const chunkData: ChatStreamChunkDto = { chunk, done };
        const eventData = `data: ${JSON.stringify(chunkData)}\n\n`;
        response.write(eventData);
        // Ensure data is sent immediately
        // Express doesn't have flush method directly, but some platforms add it
        
        // If this is the last chunk, end the response
        if (done) {
          response.end();
        }
      });
      
      // Update history in map
      this.chatHistory.set(sessionId, history);
    } catch (error) {
      // Handle errors
      const errorResponse = {
        chunk: `Error: ${error.message || 'An unknown error occurred'}`,
        done: true
      };
      response.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      response.end();
    }
  }
}
