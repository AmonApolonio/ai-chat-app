import { Controller, Post, Body, UsePipes, ValidationPipe, HttpCode, UseGuards, Res, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response, Request } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto, PdfUploadDto } from './dto/chat.dto';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
  
  @Post('upload-pdf')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Create a safe filename with session ID
          const sessionId = req.body.sessionId || 'unknown';
          const fileName = `${sessionId}-${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          cb(null, fileName);
        },
      }),
    })
  )

  @UsePipes(new ValidationPipe({ transform: true }))
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: PdfUploadDto,
    @Res() response: Response
  ): Promise<void> {
    const success = await this.chatService.processPdf(file, uploadDto.sessionId);
    response.json({
      success,
      message: success 
        ? 'PDF processed successfully' 
        : 'Failed to process PDF'
    });
  }
  
  @Post('cleanup-all-pdfs')
  @HttpCode(200)
  async cleanupAllPdfs(
    @Res() response: Response
  ): Promise<void> {
    const success = await this.chatService.cleanupAllPdfs();
    response.json({
      success,
      message: success 
        ? 'All PDF files cleaned up successfully' 
        : 'Failed to clean up PDF files'
    });
  }
}
