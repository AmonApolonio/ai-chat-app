import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum ChatMode {
  RESEARCH = 'research',
  PDF = 'pdf'
}

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsEnum(ChatMode)
  @IsOptional()
  mode?: ChatMode = ChatMode.RESEARCH;
}

export class ChatStreamChunkDto {
  chunk: string;
  done: boolean;
  status?: 'researching' | 'streaming' | 'streaming-complete' | 'formatted-complete';
  error?: boolean;
}

export class PdfUploadDto {
  @IsNotEmpty()
  @IsString()
  sessionId: string;
}
