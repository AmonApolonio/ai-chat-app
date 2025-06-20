import { Injectable } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { LlmService } from './services/llm.service';
import { AgentService } from './services/agent.service';
import { HumanMessage } from "@langchain/core/messages";

@Injectable()
export class ChatService {
  private chatHistory: Map<string, HumanMessage[]> = new Map();
  
  constructor(
    private readonly llmService: LlmService,
    private readonly agentService: AgentService
  ) {}

  async processMessage(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    // Get or create conversation history
    const sessionId = chatRequest.sessionId || 'default';
    if (!this.chatHistory.has(sessionId)) {
      this.chatHistory.set(sessionId, []);
    }
    
    const history = this.chatHistory.get(sessionId) || [];
    
    // Add user message to history
    const userMessage = new HumanMessage(chatRequest.message);
    history.push(userMessage);
    
    // Generate response using agent
    const reply = await this.agentService.generateResponse(chatRequest.message, history);
    
    // Update history in map
    this.chatHistory.set(sessionId, history);
    
    return {
      reply,
    };
  }
}
