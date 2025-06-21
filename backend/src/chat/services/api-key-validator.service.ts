import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ApiKeyValidatorService {
  private readonly logger = new Logger(ApiKeyValidatorService.name);
  private readonly apiKey: string;
  
  // Cache the validation results
  private validationStatus: { validated: boolean; valid: boolean } = { 
    validated: false, 
    valid: false 
  };
  
  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY');
    this.logger.log(`API Key: ${this.apiKey ? 'Set' : 'NOT SET'}`);
    
    // Validate the API key asynchronously on service initialization
    this.validateApiKey().catch(error => {
      this.logger.error(`Error during initial API key validation: ${error.message}`);
    });
  }
    /**
   * Get the API key
   * @returns string containing the API key
   */
  public getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Checks if the API key has valid format
   * @returns boolean indicating if API key has valid format
   */
  private hasValidFormat(): boolean {
    return Boolean(this.apiKey && 
                  typeof this.apiKey === 'string' && 
                  this.apiKey.trim() !== '');
  }
  
  /**
   * Check if the API key is valid, using cached validation if available
   * @returns boolean indicating if API key is valid
   */
  public isValid(): boolean {
    // If we've already validated with the API, return the cached result
    if (this.validationStatus.validated) {
      return this.validationStatus.valid;
    }
    
    // Otherwise, fall back to format validation
    return this.hasValidFormat();
  }
  
  /**
   * Validates the API key format and optionally with OpenAI API
   * @param forceApiCheck Force validation against the API even if cached
   * @returns Promise<boolean> indicating if API key is valid
   */
  public async validateApiKey(forceApiCheck: boolean = false): Promise<boolean> {
    // Return cached result if already validated and not forcing recheck
    if (this.validationStatus.validated && !forceApiCheck) {
      return this.validationStatus.valid;
    }
    
    // First do a quick format check
    if (!this.hasValidFormat()) {
      this.logger.warn('API key failed basic format validation (missing or invalid format)');
      this.validationStatus = { validated: true, valid: false };
      return false;
    }
    
    try {
      this.logger.log('Making test API call to validate OpenAI API key...');
      
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });
      
      const isValid = response.status === 200;
      this.validationStatus = { validated: true, valid: isValid };
      
      if (!isValid) {
        this.logger.warn('API key validation failed with OpenAI API.');
      } else {
        this.logger.log('API key validated successfully with OpenAI API.');
      }
      
      return isValid;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.logger.error('API key validation failed: Invalid authentication (401)');
      } else if (error.response && error.response.status === 403) {
        this.logger.error('API key validation failed: Forbidden (403)');
      } else {
        this.logger.error(`API key validation error: ${error.message}`);
      }
      
      this.validationStatus = { validated: true, valid: false };
      return false;
    }
  }
}
