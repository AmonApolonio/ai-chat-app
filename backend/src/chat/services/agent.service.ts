import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type HumanMessage } from "@langchain/core/messages";
import { createAgent } from './agent.factory';
import { streamLlmResponse } from './agent.llm';
import { OnTokenCallback } from './agent.types';
import { ApiKeyValidatorService } from './api-key-validator.service';

@Injectable()
export class AgentService {  private readonly logger = new Logger(AgentService.name);
  private readonly model: string;
  private readonly topicReminderMessage: string = "REMINDER: Only answer queries about companies and business topics. If this query is off-topic, respond with the standard off-topic message.";
  private readonly systemPrompt: string = `You are a specialized corporate research assistant with expertise in analyzing companies and industries.
Your primary function is to provide insightful information about companies including:

- Company performance, financials, and stock information
- Market positioning and competitive analysis
- Recent news, mergers, acquisitions, and partnerships
- Leadership teams and corporate structure
- Industry trends and market forecasts
- Business models and revenue streams
- Product or service offerings

IMPORTANT: You MUST ONLY respond to queries about companies, industries, businesses, stocks, markets, corporate entities, or business-related topics. If a user asks about ANY other topic unrelated to companies or business (such as general knowledge, personal advice, politics, entertainment, etc.), respond only with:

"I'm a specialized corporate research assistant and can only provide information about companies, industries, and business topics. Please ask me about a specific company or industry instead."

Do NOT attempt to answer any questions outside your company research scope, regardless of how the request is phrased.

When researching companies:

1. Search for the most current information about the company or industry
2. Provide data-driven insights when available
3. Compare companies within their industry when relevant
4. Include important dates (founded, IPO, major milestones) with the current time for context
5. Structure information clearly with key points highlighted
6. Always include 3-5 relevant links to additional resources

Tools at your disposal:

- web_search: Use for finding comprehensive information about companies, including general facts, news, financial data, and useful web resources
- get_current_time: Use to provide context about when the information was retrieved

RESPONSE FORMATTING REQUIREMENTS:
- Use proper Markdown formatting throughout your response
- Begin with a clear ### Company Name heading
- Organize content into logical sections with ### Section Headings
- For subsections use #### Subsection Headings 
- Always include blank lines before and after headings, paragraphs, lists, and code blocks
- Format lists with proper spacing (blank line before and after the list)
- Use bold (**text**) for important terms, statistics, and key metrics
- Use bullet points (- item) for feature lists and unordered information
- Use numbered lists (1. item) for sequential steps or ranked information
- For data tables, use proper markdown table syntax with aligned columns
- Always end with a "### Useful Resources" section with properly formatted markdown links: [Title](URL)

This formatting ensures your responses will be easy to read and well-structured.`;

  private agentExecutorPromise: Promise<any> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiKeyValidator: ApiKeyValidatorService
  ) {
    this.logger.log('Initializing AgentService');
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
    this.logger.log(`Configuration: Model=${this.model}, API Key=${this.apiKeyValidator.getApiKey() ? 'Set' : 'NOT SET'}`);
      if (this.apiKeyValidator.isValid()) {
      this.logger.log('API key appears valid. Creating agent executor...');
      this.agentExecutorPromise = createAgent({
        model: this.model,
        apiKey: this.apiKeyValidator.getApiKey(),
        systemPrompt: this.systemPrompt,
        logger: this.logger
      })
        .then(executor => {
          this.logger.log('Agent executor created successfully');
          return executor;
        })
        .catch(error => {
          this.logger.error(`Failed to create agent executor: ${error.message}`);
          throw error;
        });
    } else {
      this.logger.warn('Invalid or missing API key. Agent functionality will not work properly.');
    }
  }    
  async streamResponse(message: string, chatHistory: HumanMessage[] = [], onToken: OnTokenCallback, abortSignal?: AbortSignal): Promise<void> {
    try {
      if (!this.apiKeyValidator.isValid()) {
        const isValid = await this.apiKeyValidator.validateApiKey();
        if (!isValid) {
          onToken('API key not configured or invalid. Please set a valid LLM_API_KEY environment variable.', true, undefined, true);
          return;
        }
      }

      if (!this.agentExecutorPromise) {
        onToken('Agent not initialized. Please check your configuration.', true);
        return;
      }

      // Signal that we're entering research/tool execution phase
      onToken('', false, 'researching');
      this.logger.log('Agent entered researching state');

      let agentContext = '';
      let toolExecutionError = false;

      try {
        // First, call the agent executor to potentially invoke tools
        const agentExecutor = await this.agentExecutorPromise;
        const input = {
          input: message,
          chat_history: chatHistory,
          signal: abortSignal
        };
        
        this.logger.log('Running agent executor with input:', message);
        const result = await agentExecutor.call(input);
        this.logger.log('Agent execution complete');
        
        // Extract useful information from the agent result
        if (result.intermediateSteps && result.intermediateSteps.length > 0) {
          // Build context from tool executions
          agentContext = 'Tool execution results:\n';
          result.intermediateSteps.forEach(step => {
            if (step.action && step.observation) {
              const toolName = step.action.tool || 'unknown_tool';
              agentContext += `[${toolName}] Input: ${JSON.stringify(step.action.toolInput)}\n`;
              agentContext += `[${toolName}] Result: ${step.observation}\n\n`;
            }
          });
          this.logger.log(`Generated agent context from ${result.intermediateSteps.length} tool executions`);
        }
      } catch (agentError) {
        this.logger.error(`Error in agent execution: ${agentError.message}`);
        toolExecutionError = true;
        agentContext = `Note: There was an error executing tools: ${agentError.message}`;
      }      // Signal that we're transitioning to streaming response phase
      onToken('', false, 'streaming');
      this.logger.log('Agent entered streaming state');      // Now stream the response with the enhanced context from tool executions
      await streamLlmResponse({
        model: this.model,
        apiKey: this.apiKeyValidator.getApiKey(),
        message: toolExecutionError 
          ? `${message}\n\n${agentContext}\n\n${this.topicReminderMessage}` 
          : agentContext 
            ? `${message}\n\nUse this company research information to provide an insightful analysis:\n${agentContext}\n\n${this.topicReminderMessage}` 
            : `${message}\n\n${this.topicReminderMessage}`,
        chatHistory,
        onToken,
        logger: this.logger,
        abortSignal
      });
    } catch (error: any) {
      this.logger.error(`Error setting up streaming: ${error.message}`);
      
      let errorMessage: string;
      if (error.name === 'AuthenticationError') {
        errorMessage = 'Authentication failed with the AI service. Please check that your API key is valid and correctly configured.';
      } else if (error.name === 'RateLimitError') {
        errorMessage = 'The rate limit for AI requests has been reached. Please try again later.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        errorMessage = 'Failed to connect to the AI service. Please check your network connection or try again later.';
      } else {
        errorMessage = `An error occurred with the AI service: ${error.message}`;
      }
      
      onToken(errorMessage, true, undefined, true);
    }
  }
  async streamPdfResponse(
    query: string,
    pdfContent: string,
    onToken: OnTokenCallback,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      if (!this.apiKeyValidator.isValid()) {
        const isValid = await this.apiKeyValidator.validateApiKey();
        if (!isValid) {
          onToken('API key not configured or invalid. Please set a valid LLM_API_KEY environment variable.', true, undefined, true);
          return;
        }
      }

      // Signal that we're entering streaming phase
      onToken('', false, 'streaming');
      this.logger.log('PDF mode: Starting response generation');      const systemPrompt = `You are a helpful assistant answering questions about the content of a PDF document.
Below is the relevant content extracted from the PDF based on the user's query:

${pdfContent}

INSTRUCTIONS:
1. If the user asks about what's in the PDF or for a general overview, summarize the provided content sections to give them a clear understanding of the document.
2. For specific questions, provide detailed answers using ONLY the information in the provided content.
3. If the answer is not in the provided content, explain: "Based on the sections of the PDF I have access to, I don't have that specific information. Could you try asking in a different way?"
4. Format your response using Markdown for better readability when appropriate.
5. Use bullet points, headings, and other formatting to organize your response clearly.
6. If quoting from the document, use ">" markdown quote formatting.
7. BE DETAILED and THOROUGH in your answers, using all relevant information from the provided content.`;      
// Stream the response using the direct LLM without tools
      await streamLlmResponse({
        apiKey: this.apiKeyValidator.getApiKey(),
        model: this.model,
        message: query,
        systemPrompt: systemPrompt,
        onToken,
        logger: this.logger,
        abortSignal
      });
    } catch (error: any) {
      this.logger.error(`Error streaming PDF response: ${error.message}`);
      
      let errorMessage: string;
      if (error.name === 'AuthenticationError') {
        errorMessage = 'Authentication failed with the AI service. Please check that your API key is valid and correctly configured.';
      } else if (error.name === 'RateLimitError') {
        errorMessage = 'The rate limit for AI requests has been reached. Please try again later.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        errorMessage = 'Failed to connect to the AI service. Please check your network connection or try again later.';
      } else if (error.message.includes('PDF')) {
        errorMessage = `PDF processing error: ${error.message}`;
      } else {
        errorMessage = `An error occurred with the AI service: ${error.message}`;
      }
      
      onToken(errorMessage, true, undefined, true);
    }
  }
}