import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class ChatResponseDto {
  reply: string;
}

export class ChatStreamChunkDto {
  chunk: string;
  done: boolean;
}
