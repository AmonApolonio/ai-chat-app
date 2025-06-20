import { IsNotEmpty, IsString } from 'class-validator';

export class ChatRequestDto {
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @IsString()
  message: string;
}

export class ChatResponseDto {
  reply: string;
}
