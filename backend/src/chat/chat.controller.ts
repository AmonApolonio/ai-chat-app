import { Controller, Post, Body, UsePipes, ValidationPipe, HttpCode, UseGuards, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';

function setupAbortOnClientDisconnect(request: Request, response: Response): AbortController {
  const abortController = new AbortController();
  request.on('close', () => {
    abortController.abort();
    response.end();
  });
  return abortController;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async sendMessage(
    @Body() chatRequest: ChatRequestDto,
    @Res() response: Response,
    @Req() request: Request
  ): Promise<void> {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    const abortController = setupAbortOnClientDisconnect(request, response);
    await this.chatService.streamResponse(chatRequest, response, abortController.signal);
  }
}
