import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AgentService } from './services/agent.service';
import { PdfService } from './services/pdf.service';
import { ApiKeyValidatorService } from './services/api-key-validator.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],  
  controllers: [ChatController],
  providers: [ChatService, ApiKeyValidatorService, AgentService, PdfService],
})
export class ChatModule { }
