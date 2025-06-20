import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type HumanMessage } from "@langchain/core/messages";
import { createAgent } from './agent.factory';
import { streamLlmResponse } from './agent.llm';
import { OnTokenCallback } from './agent.types';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string = `You are a helpful assistant.`;

  private agentExecutorPromise: Promise<any> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Initializing AgentService');
    this.apiKey = this.configService.get<string>('LLM_API_KEY');
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
    this.logger.log(`Configuration: Model=${this.model}, API Key=${this.apiKey ? 'Set' : 'NOT SET'}`);
    if (!this.apiKey) {
      this.logger.warn('LLM_API_KEY is not set. Agent functionality will not work properly.');
    } else {
      this.agentExecutorPromise = createAgent({
        model: this.model,
        apiKey: this.apiKey,
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
    }
  }

  async streamResponse(message: string, chatHistory: HumanMessage[] = [], onToken: OnTokenCallback, abortSignal?: AbortSignal): Promise<void> {
    try {
      if (!this.apiKey) {
        onToken('API key not configured. Please set the LLM_API_KEY environment variable.', true);
        return;
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
      }

      // Signal that we're transitioning to streaming response phase
      onToken('', false, 'streaming');
      this.logger.log('Agent entered streaming state');

      // Now stream the response with the enhanced context from tool executions
      await streamLlmResponse({
        model: this.model,
        apiKey: this.apiKey,
        message: toolExecutionError 
          ? `${message}\n\n${agentContext}` 
          : agentContext 
            ? `${message}\n\nUse this information to help answer: ${agentContext}` 
            : message,
        chatHistory,
        onToken,
        logger: this.logger,
        abortSignal
      });
    } catch (error: any) {
      this.logger.error(`Error setting up streaming: ${error.message}`);
      onToken(`An error occurred: ${error.message}`, true);
    }
  }
}