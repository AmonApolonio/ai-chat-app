import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { DynamicTool } from "langchain/tools";

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
    const llm = new ChatOpenAI({
      modelName: model,
      openAIApiKey: apiKey,
      temperature: 0,
    });
    // Tool: get_current_time
    const getCurrentTimeTool = new DynamicTool({
      name: "get_current_time",
      description: "Returns the current server time in ISO format.",
      func: async () => {
        return new Date().toISOString();
      },
    });
    const tools = [getCurrentTimeTool];
    logger.log(`Registered ${tools.length} tools`);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder({ variableName: "chat_history", optional: true }),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);
    const agent = await createToolCallingAgent({
      llm,
      tools,
      prompt
    });
    const executor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      verbose: true,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
      maxIterations: 3
    });
    return executor;
  } catch (error: any) {
    logger.error(`Failed to create agent: ${error.message}`);
    throw error;
  }
}
