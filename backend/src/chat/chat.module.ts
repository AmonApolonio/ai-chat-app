import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmService } from './services/llm.service';
import { AgentService } from './services/agent.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, LlmService, AgentService],
})
export class ChatModule {}
