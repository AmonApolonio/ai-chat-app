import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AgentService } from './services/agent.service';
import { PdfService } from './services/pdf.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      storage: undefined, // Use memory storage only
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],
  controllers: [ChatController],
  providers: [ChatService, AgentService, PdfService],
})
export class ChatModule {}
