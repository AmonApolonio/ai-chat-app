import { Injectable } from '@nestjs/common';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Injectable()
export class ChatService {
  processMessage(chatRequest: ChatRequestDto): ChatResponseDto {
    // For now, just echo the message in uppercase as per requirements
    return {
      reply: `Bot: ${chatRequest.message.toUpperCase()}`,
    };
  }
}
