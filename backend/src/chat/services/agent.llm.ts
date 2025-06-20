import { ChatOpenAI } from "@langchain/openai";
import { type HumanMessage, SystemMessage } from "@langchain/core/messages";
import { OnTokenCallback } from "./agent.types";

// Function to format the complete answer using the LLM
async function formatCompletedAnswer({
  model,
  apiKey,
  completeAnswer,
  logger,
}: {
  model: string;
  apiKey: string;
  completeAnswer: string;
  logger: { log: (msg: string) => void; error: (msg: string) => void };
}): Promise<string> {
  try {
    logger.log('Formatting complete answer with LLM');
    
    const formattingLlm = new ChatOpenAI({
      modelName: model,
      openAIApiKey: apiKey,
      temperature: 0,
    });

    const formattingPrompt = `
You are a formatting assistant. Your job is to improve the readability and visual presentation of the following text for a chat interface.
Apply proper markdown formatting with:
- Clear section headings (### for main sections, #### for subsections)
- Proper paragraph spacing
- Well-formatted lists with appropriate whitespace
- Bold and italic text for emphasis where appropriate
- Properly formatted links
- Clean code blocks if code is present

DO NOT change the content meaning or add new information. Only improve the formatting.

Text to format:
${completeAnswer}
`;

    const response = await formattingLlm.invoke([
      { role: 'system', content: 'You are a formatting assistant that only improves the visual presentation of text.' },
      { role: 'user', content: formattingPrompt }
    ]);

    const formattedAnswer = response.content as string;
    logger.log('Successfully formatted the answer');
    return formattedAnswer;
  } catch (error: any) {
    logger.error(`Error in formatting complete answer: ${error.message}`);
    // Return the original answer if formatting fails
    return completeAnswer;
  }
}

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
      }      // First, signal that streaming is complete with the initial unformatted answer
      onToken('', true, 'streaming-complete');
      logger.log('Stream completed successfully');
      logger.log(`Initial answer processed`);
      
      // Then format the complete answer and send as a separate event
      logger.log('Formatting the complete answer');
      try {
        const formattedCompleteAnswer = await formatCompletedAnswer({
          model,
          apiKey,
          completeAnswer,
          logger,
        });
        // Send the formatted answer as a separate event
        onToken(formattedCompleteAnswer, true, 'formatted-complete');
        logger.log('Formatted answer sent to client');
        logger.log(formattedCompleteAnswer);
      } catch (formatError) {
        logger.error(`Error formatting answer: ${formatError.message}`);
        // If formatting fails, send the original answer as formatted-complete
        onToken(completeAnswer, true, 'formatted-complete');
      }
    } catch (streamError) {
      logger.error(`Error in stream processing: ${streamError.message}`);
      throw streamError;
    }
  } catch (error: any) {
    logger.error(`Error in streaming response: ${error.message}`);
    onToken(`An error occurred while processing your request: ${error.message}`, true);
  }
}


