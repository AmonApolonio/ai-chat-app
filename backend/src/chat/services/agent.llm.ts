import { ChatOpenAI } from "@langchain/openai";
import { type HumanMessage } from "@langchain/core/messages";
import { OnTokenCallback } from "./agent.types";

export async function streamLlmResponse({
  model,
  apiKey,
  message,
  chatHistory,
  onToken,
  logger,
  abortSignal,
}: {
  model: string;
  apiKey: string;
  message: string;
  chatHistory: HumanMessage[];
  onToken: OnTokenCallback;
  logger: { log: (msg: string) => void; error: (msg: string) => void };
  abortSignal?: AbortSignal;
}): Promise<void> {
  logger.log(`Streaming response for query: "${message}"`);
  const streamingLlm = new ChatOpenAI({
    modelName: model,
    openAIApiKey: apiKey,
    temperature: 0,
    streaming: true,
  });
  
  // Format chat history properly
  const formattedChatHistory = chatHistory.map(msg => ({
    type: 'human',
    content: typeof msg.content === 'string' ? msg.content : String(msg.content)
  }));
  
  try {
    // Check if the message contains tool execution context (added by agent)
    const hasToolContext = message.includes('Tool execution results:') || 
                          message.includes('Use this information to help answer:');
    
    // Extract the original user query and the tool context, if present
    let userQuery = message;
    let toolContext = '';
    
    if (hasToolContext) {
      // Simple extraction - the agent's format puts the original query first
      const parts = message.split('\n\n');
      if (parts.length >= 2) {
        userQuery = parts[0];
        toolContext = parts.slice(1).join('\n\n');
      }
    }
    
    // Create appropriate messages for the LLM
    const systemContent = toolContext 
      ? `You are a helpful assistant. When answering, use the following context information: ${toolContext}`
      : 'You are a helpful assistant.';
      
    const messages = [
      { role: 'system', content: systemContent },
      ...formattedChatHistory.map(msg => ({ role: 'user', content: msg.content })),
      { role: 'user', content: userQuery },
    ];
    
    logger.log('Starting LLM stream with messages setup');
    
    try {
      const stream = await streamingLlm.stream(messages);
      
      for await (const chunk of stream) {
        if (abortSignal?.aborted) {
          logger.log('Aborting LLM stream');
          break;
        }
        
        if (chunk.content !== undefined && chunk.content !== null) {
          let content = '';
          
          if (typeof chunk.content === 'string') {
            content = chunk.content;
          } else if (Array.isArray(chunk.content)) {
            content = chunk.content
              .filter(item => typeof item === 'string' || (item && 'text' in item))
              .map(item => {
                if (typeof item === 'string') return item;
                return 'text' in item ? String(item.text) : '';
              })
              .join('');
          }
          
          if (content && content.trim() !== '') {
            onToken(content, false, 'streaming');
          }
        }
      }
      
      logger.log('Stream completed successfully');
      onToken('', true);
    } catch (streamError) {
      logger.error(`Error in stream processing: ${streamError.message}`);
      throw streamError;
    }
  } catch (error: any) {
    logger.error(`Error in streaming response: ${error.message}`);
    onToken(`An error occurred while processing your request: ${error.message}`, true);
  }
}
