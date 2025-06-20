import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AgentService } from './services/agent.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, AgentService],
})
export class ChatModule {}
