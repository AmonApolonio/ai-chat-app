import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor } from "langchain/agents";
import { createTools } from './tools';
import { configureAgent } from './agent.config';

export async function createAgent({
  model,
  apiKey,
  systemPrompt,
  logger
}: {
  model: string;
  apiKey: string;
  systemPrompt: string;
  logger: { log: (msg: string) => void; error: (msg: string) => void };
}): Promise<AgentExecutor> {
  try {
    logger.log(`Creating agent with model: ${model}`);
    
    // Initialize the LLM
    const llm = new ChatOpenAI({
      modelName: model,
      openAIApiKey: apiKey,
      temperature: 0,
    });
    
    // Create tools
    const tools = createTools(logger);
    logger.log(`Registered ${tools.length} tools`);
    
    // Configure and return the agent
    const executor = await configureAgent({
      llm,
      tools,
      systemPrompt
    });
    
    return executor;
  } catch (error: any) {
    logger.error(`Failed to create agent: ${error.message}`);
    throw error;
  }
}
