import { Injectable } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { LlmService } from './services/llm.service';

@Injectable()
export class ChatService {
  constructor(private readonly llmService: LlmService) {}

  async processMessage(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const reply = await this.llmService.generateResponse(chatRequest.message);
    
    return {
      reply,
    };
  }
}
