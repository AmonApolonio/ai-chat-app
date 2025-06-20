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
  
  async generateResponse(message: string, chatHistory: HumanMessage[] = []): Promise<string> {
    try {
      if (!this.apiKey) {
        return 'API key not configured. Please set the LLM_API_KEY environment variable.';
      }

      if (!this.agentExecutorPromise) {
        return 'Agent not initialized. Please check your configuration.';
      }
      
      this.logger.log(`Processing query: "${message}"`);
      
      // If this is a time-related query, use a direct approach
      if (message.toLowerCase().includes('time')) {
        this.logger.log("Time-related query detected, using direct tool execution");
        
        try {
          // Get the executor
          const agentExecutor = await this.agentExecutorPromise;
          
          // Format chat history
          const formattedChatHistory = chatHistory.map(msg => ({
            type: 'human',
            content: typeof msg.content === 'string' ? msg.content : String(msg.content)
          }));
          
          // For time queries, force the model to use the tool with explicit instructions
          const timeMessage = "Please tell me the current time. You MUST use the current_time tool.";
          
          // Execute with explicit callbacks
          const result = await agentExecutor.invoke({
            input: timeMessage,
            chat_history: formattedChatHistory
          });
          
          // If we got a result, use it
          if (result.output && result.output.trim() !== '') {
            return result.output;
          }
          
          // If tool steps were used, extract the tool result directly
          if (result.intermediateSteps && result.intermediateSteps.length > 0) {
            const timeStep = result.intermediateSteps.find(step => 
              step.action?.tool === 'current_time');
            
            if (timeStep && timeStep.observation) {
              return `The current time is ${timeStep.observation}`;
            }
          }
          
          // Fallback: Call the time tool directly
          const timeTool = new DynamicTool({
            name: "current_time",
            description: "Returns the current time and date.",
            func: async () => new Date().toLocaleString()
          });
          
          const timeResult = await timeTool.invoke("");
          return `The current time is ${timeResult}`;
        } catch (error) {
          this.logger.error(`Error handling time query: ${error.message}`);
          // Direct fallback
          return `The current time is ${new Date().toLocaleString()}`;
        }
      }
      
      const agentExecutor = await this.agentExecutorPromise;
      
      // Format chat history for the agent
      const formattedChatHistory = chatHistory.map(msg => ({
        type: 'human',
        content: typeof msg.content === 'string' ? msg.content : String(msg.content)
      }));
      
      // Add detailed logging before execution
      this.logger.log(`Executing agent with query: "${message}"`);
      this.logger.log(`Chat history length: ${formattedChatHistory.length}`);
      
      // Execute the agent with explicit callbacks for debugging
      const result = await agentExecutor.invoke({
        input: message,
        chat_history: formattedChatHistory
      }, {
        callbacks: [
          {
            handleToolStart: (tool, input) => {
              this.logger.log(`Tool ${tool.name} starting with input: ${input}`);
              return undefined;
            },
            handleToolEnd: (output) => {
              this.logger.log(`Tool returned: ${output}`);
              return undefined;
            },
            handleChainError: (err) => {
              this.logger.error(`Chain error: ${err.message}`);
              return undefined;
            }
          }
        ]
      });
      
      // Check result and provide detailed logging
      this.logger.log(`Agent result: ${JSON.stringify(result)}`);
      
      // If there are no intermediate steps, it means no tools were used
      if (!result.intermediateSteps || result.intermediateSteps.length === 0) {
        this.logger.warn('No tools were used in this execution');
      }
      
      // Handle empty responses with a more informative fallback
      if (!result.output || result.output.trim() === '') {
        this.logger.warn('Empty response received, using fallback');
        
        // Create direct fallback for time queries
        if (message.toLowerCase().includes('time')) {
          const now = new Date().toLocaleString();
          return `The current time is ${now}. (Note: This is a fallback response as the agent tool didn't work properly)`;
        }
        
        return "I couldn't generate a proper response. If you were asking about the time, the current time is " + 
               new Date().toLocaleString();
      }
      
      return result.output;
    } catch (error) {
      this.logger.error(`Error generating response: ${error.message}`);
      return 'An error occurred while processing your request.';
    }
  }
}