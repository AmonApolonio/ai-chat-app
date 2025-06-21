import { jest } from '@jest/globals';
import { OnTokenCallback } from '../../services/agent.types';
import { HumanMessage } from '@langchain/core/messages';

// Mock for streamLlmResponse function
export const streamLlmResponse = jest.fn().mockImplementation(async ({
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
}) => {
  // Mock simple behavior - just call onToken with a mock response
  onToken('Mock LLM response for: ' + message, false, 'streaming');
  // Wait a bit to simulate streaming
  await new Promise(resolve => setTimeout(resolve, 100));
  // Send a streaming complete signal
  onToken('', true, 'streaming-complete');
  // Wait again to simulate formatting
  await new Promise(resolve => setTimeout(resolve, 100));
  // Send a formatted response
  onToken('Formatted mock response with **markdown**', true, 'formatted-complete');
});

// Mock for formatCompletedAnswer function
export const formatCompletedAnswer = jest.fn().mockImplementation(async ({
  model,
  apiKey,
  completeAnswer,
  logger,
}: {
  model: string;
  apiKey: string;
  completeAnswer: string;
  logger: { log: (msg: string) => void; error: (msg: string) => void };
}) => {
  return `Formatted: ${completeAnswer}`;
});
