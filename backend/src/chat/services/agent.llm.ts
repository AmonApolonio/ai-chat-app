import { ChatOpenAI } from "@langchain/openai";
import { type HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OnTokenCallback } from "./agent.types";

export async function streamLlmResponse({
  model,
  apiKey,
  message,
  chatHistory,
  onToken,
  logger,
  abortSignal,
  systemPrompt,
}: {
  model: string;
  apiKey: string;
  message: string;
  chatHistory?: HumanMessage[];
  onToken: OnTokenCallback;
  logger: { log: (msg: string) => void; error: (msg: string) => void };
  abortSignal?: AbortSignal;
  systemPrompt?: string;
}): Promise<void> {
  logger.log(`Streaming response for query: "${message}"`);
  const streamingLlm = new ChatOpenAI({
    modelName: model,
    openAIApiKey: apiKey,
    temperature: 0,
    streaming: true,
  });

  // Format chat history properly
  const formattedChatHistory = chatHistory?.map(msg => ({
    type: 'human',
    content: typeof msg.content === 'string' ? msg.content : String(msg.content)
  })) || [];

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
    // System prompt with formatting instructions    // If system prompt is provided, use it; otherwise, use default
    const systemContent = systemPrompt || `You are a helpful assistant.

  Format your response with proper markdown:
  1. Use clear section headings with ### for main sections and #### for subsections
  2. Ensure there's a blank line between paragraphs and sections
  3. For lists, place a blank line before the list starts and after it ends
  4. Use bullet points (- item) or numbered lists (1. item) with proper spacing
  5. Highlight important information using **bold** or *italics*
  6. Avoid using tables, charts, or graphs as they won't render properly
  7. Present data in simple lists or paragraphs instead of tabular format
  8. Ensure URLs are properly formatted as markdown links: [title](url)
  ${toolContext ? `\n\nWhen answering, use the following context information: ${toolContext}` : ''}`;

    let messages;
    
    if (chatHistory) {
      // Standard mode with chat history
      messages = [
        { role: 'system', content: systemContent },
        ...formattedChatHistory.map(msg => ({ role: 'user', content: msg.content })),
        { role: 'user', content: userQuery },
      ];
    } else {
      // PDF mode with direct question and answer
      messages = [
        { role: 'system', content: systemContent },
        { role: 'user', content: message },
      ];
    }

    logger.log('Starting LLM stream with messages setup');

    try {
      const stream = await streamingLlm.stream(messages);

      // Track the complete answer
      let completeAnswer = '';

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
            // Send the content directly without formatting
            onToken(content, false, 'streaming');
            completeAnswer += content; // Keep track of the complete answer
          }
        }
      }
      onToken('', true);
      logger.log('Stream completed successfully');
      logger.log(`Final answer processed`);
      logger.log(completeAnswer);
    } catch (streamError) {
      logger.error(`Error in stream processing: ${streamError.message}`);
      throw streamError;
    }
  } catch (error: any) {
    logger.error(`Error in streaming response: ${error.message}`);
    onToken(`An error occurred while processing your request: ${error.message}`, true);
  }
}


