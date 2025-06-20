import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";

export async function configureAgent({ 
  llm, 
  tools, 
  systemPrompt 
}: { 
  llm: any; 
  tools: any[]; 
  systemPrompt: string;
}): Promise<AgentExecutor> {
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
  
  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    verbose: true,
    returnIntermediateSteps: true,
    handleParsingErrors: true,
    maxIterations: 3
  });
}
