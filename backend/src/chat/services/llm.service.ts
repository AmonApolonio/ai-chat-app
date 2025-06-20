import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly apiUrl: string;
  private readonly systemPrompt: string = `You are an expert researcher specializing in company information. Your task is to:

1. Ask the user which company they want to research if they haven't specified one
2. Provide detailed, accurate information about companies including:
   - Company history and founding
   - Key products or services
   - Market position and competitors
   - Recent news or developments
   - Financial performance (if a public company)
   - Leadership team
   
If the user asks questions not related to company research, politely redirect them by saying:
"I'm specialized in providing information about companies. Please ask me about a specific company you'd like to research."`;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY');
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
    this.apiUrl = this.configService.get<string>('LLM_API_URL', 'https://api.openai.com/v1/chat/completions');
    
    if (!this.apiKey) {
      this.logger.warn('LLM_API_KEY is not set. LLM functionality will not work properly.');
    }
  }

  async generateResponse(message: string): Promise<string> {
    try {
      if (!this.apiKey) {
        return 'API key not configured. Please set the LLM_API_KEY environment variable.';
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: message }
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        this.logger.error(`LLM API error: ${JSON.stringify(errorData)}`);
        return 'An error occurred while communicating with the LLM API.';
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error(`Error generating LLM response: ${error.message}`);
      return 'An error occurred while processing your request.';
    }
  }
}
