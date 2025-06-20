import { Controller, Post, Body, UsePipes, ValidationPipe, HttpCode, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendMessage(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.processMessage(chatRequest);
  }
}
