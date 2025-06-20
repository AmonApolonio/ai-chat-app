import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicTool } from "@langchain/core/tools";
import { type HumanMessage } from "@langchain/core/messages";

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly systemPrompt: string = `You are a helpful assistant with access to a tool:
- current_time: tells the current time and date (always use this for time/date questions)

IMPORTANT: When the user asks anything about the current time or date, you MUST use the current_time tool.
DO NOT try to determine the time yourself - ALWAYS use the current_time tool for those questions.

Examples:
Q: What time is it?
A: [use the current_time tool]
`;

  private agentExecutorPromise: Promise<AgentExecutor> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.logger.log('Initializing AgentService');
    
    this.apiKey = this.configService.get<string>('LLM_API_KEY');
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
    
    this.logger.log(`Configuration: Model=${this.model}, API Key=${this.apiKey ? 'Set' : 'NOT SET'}`);
    
    if (!this.apiKey) {
      this.logger.warn('LLM_API_KEY is not set. Agent functionality will not work properly.');
    } else {
      this.agentExecutorPromise = this.createAgent()
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

  private async createAgent(): Promise<AgentExecutor> {
    try {
      this.logger.log(`Creating agent with model: ${this.model}`);
      
      // Initialize the LLM with configuration to REQUIRE tool usage for time queries
      const llm = new ChatOpenAI({
        modelName: this.model,
        openAIApiKey: this.apiKey,
        temperature: 0,
        // Remove modelKwargs.tool_choice to let the agent decide
      });
      
      // Create a simplified time tool that's more likely to execute properly
      const timeTool = new DynamicTool({
        name: "current_time",
        description: "Returns the current time and date.",
        func: async () => {
          try {
            const now = new Date();
            const timeString = now.toLocaleString();
            this.logger.log(`✅ Time tool executed: ${timeString}`);
            return timeString;
          } catch (error) {
            this.logger.error(`Error in time tool: ${error.message}`);
            return new Date().toLocaleString(); // Always return something, even on error
          }
        },
      });
      
      const tools = [timeTool];
      this.logger.log(`Registered ${tools.length} tool: ${tools.map(t => t.name).join(', ')}`);
      
      // Create a prompt template that explicitly instructs tool usage
      const prompt = ChatPromptTemplate.fromMessages([
        ["system", this.systemPrompt],
        new MessagesPlaceholder({
          variableName: "chat_history", 
          optional: true
        }),
        ["human", "{input}"],
        new MessagesPlaceholder("agent_scratchpad"),
      ]);
      
      // Create the agent with explicit configuration
      const agent = await createOpenAIFunctionsAgent({
        llm,
        tools,
        prompt
      });
      
      // Create the executor with simplified settings that are more likely to work
      const executor = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        verbose: true,
        returnIntermediateSteps: true,
        handleParsingErrors: true,
        maxIterations: 3
      });

      // Test the time tool directly to verify it works
      this.testTimeTool(timeTool);
      
      return executor;
    } catch (error) {
      this.logger.error(`Failed to create agent: ${error.message}`);
      throw error;
    }
  }
  // Helper method to test the time tool directly
  private async testTimeTool(tool: DynamicTool): Promise<void> {
    try {
      this.logger.log("Testing time tool directly...");
      const result = await tool.invoke("");
      this.logger.log(`✅ Time tool test result: ${result}`);
    } catch (error) {
      this.logger.error(`❌ Time tool test failed: ${error.message}`);
    }
  }

  // New method to stream tokens as they're generated
  async streamResponse(message: string, chatHistory: HumanMessage[] = [], onToken: (chunk: string, done: boolean) => void): Promise<void> {
    try {
      if (!this.apiKey) {
        onToken('API key not configured. Please set the LLM_API_KEY environment variable.', true);
        return;
      }

      if (!this.agentExecutorPromise) {
        onToken('Agent not initialized. Please check your configuration.', true);
        return;
      }

      this.logger.log(`Streaming response for query: "${message}"`);

      // Create a streaming-enabled LLM
      const streamingLlm = new ChatOpenAI({
        modelName: this.model,
        openAIApiKey: this.apiKey,
        temperature: 0,
        streaming: true,
      });

      // Format chat history for the model
      const formattedChatHistory = chatHistory.map(msg => ({
        type: 'human',
        content: typeof msg.content === 'string' ? msg.content : String(msg.content)
      }));

      // Special case for time-related queries since they need tools
      if (message.toLowerCase().includes('time')) {
        // For time queries, we'll handle them directly since tools don't stream well
        try {
          // Get the current time
          const now = new Date().toLocaleString();
          const timeResponse = `The current time is ${now}`;
          
          // Simulate streaming for a better UX
          const words = timeResponse.split(' ');
          for (let i = 0; i < words.length; i++) {
            const isLast = i === words.length - 1;
            // Stream word by word with spaces
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay between words
            onToken(words[i] + (isLast ? '' : ' '), isLast);
          }
          return;
        } catch (error) {
          this.logger.error(`Error in time streaming: ${error.message}`);
          onToken(`The current time is ${new Date().toLocaleString()}`, true);
          return;
        }
      }

      // For non-time queries, use the streaming LLM directly
      try {
        // Create a simple prompt for direct streaming (bypassing the agent for streaming)
        const messages = [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...formattedChatHistory.map(msg => ({ role: 'user', content: msg.content })),
          { role: 'user', content: message },
        ];        // Stream the response directly
        const stream = await streamingLlm.stream(messages);

        // Process each chunk as it arrives
        let isFirstChunk = true;
        for await (const chunk of stream) {          if (chunk.content) {
            // Convert any content type to string safely
            let content = '';
            
            if (typeof chunk.content === 'string') {
              content = chunk.content;
            } else if (Array.isArray(chunk.content)) {
              // For complex content, extract text parts
              content = chunk.content
                .filter(item => typeof item === 'string' || 'text' in item)
                .map(item => typeof item === 'string' ? item : ('text' in item ? item.text : ''))
                .join('');
            }
            
            if (content) {
              onToken(content, false);
              isFirstChunk = false;
            }
          }
        }
        
        // Signal completion
        onToken('', true);
      } catch (error) {
        this.logger.error(`Error in streaming response: ${error.message}`);
        onToken(`An error occurred while processing your request: ${error.message}`, true);
      }
    } catch (error) {
      this.logger.error(`Error setting up streaming: ${error.message}`);
      onToken(`An error occurred: ${error.message}`, true);
    }
  }
}