import { Controller, Post, Body, UsePipes, ValidationPipe, HttpCode, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}
  @Post()
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @UsePipes(new ValidationPipe({ transform: true }))  async sendMessage(@Body() chatRequest: ChatRequestDto, @Res() response: Response): Promise<void> {
    // Set up SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    // Process and stream tokens
    await this.chatService.streamResponse(chatRequest, response);
  }
}
