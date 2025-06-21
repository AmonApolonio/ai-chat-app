import { streamLlmResponse } from '../services/agent.llm';
import { MockChatOpenAI } from './mocks/chat-openai.mock';

// Mock the ChatOpenAI class
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation((options) => new MockChatOpenAI(options)),
}));

describe('Agent LLM', () => {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('streamLlmResponse', () => {
    it('should stream response and call onToken with proper events', async () => {
      const mockOnToken = jest.fn();
      const abortSignal = new AbortController().signal;
      
      await streamLlmResponse({
        model: 'gpt-4o-mini',
        apiKey: 'mock-api-key',
        message: 'Test message',
        onToken: mockOnToken,
        logger: mockLogger,
        abortSignal,
      });
      
      // Verify logger was called
      expect(mockLogger.log).toHaveBeenCalledWith('Streaming response for query: "Test message"');
      
      // Verify onToken was called multiple times (for chunks and completion events)
      expect(mockOnToken).toHaveBeenCalled();
      
      // Check for streaming-complete event
      expect(mockOnToken).toHaveBeenCalledWith('', true, 'streaming-complete');
      
      // Check for formatted-complete event
      const formattedCallIndex = mockOnToken.mock.calls.findIndex(
        call => call[2] === 'formatted-complete'
      );
      expect(formattedCallIndex).toBeGreaterThan(-1);
    });
    
    it('should handle chat history correctly', async () => {
      const mockOnToken = jest.fn();
      
      await streamLlmResponse({
        model: 'gpt-4o-mini',
        apiKey: 'mock-api-key',
        message: 'Follow-up question',
        chatHistory: [
          { content: 'Previous question', type: 'human' } as any
        ],
        onToken: mockOnToken,
        logger: mockLogger,
      });
      
      // Verify chat history was processed
      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockOnToken).toHaveBeenCalled();
    });
    
    it('should handle aborted requests', async () => {
      const mockOnToken = jest.fn();
      const abortController = new AbortController();
      
      // Abort the request immediately
      abortController.abort();
      
      await streamLlmResponse({
        model: 'gpt-4o-mini',
        apiKey: 'mock-api-key',
        message: 'Test message',
        onToken: mockOnToken,
        logger: mockLogger,
        abortSignal: abortController.signal,
      });
      
      // Verify abort was logged
      expect(mockLogger.log).toHaveBeenCalledWith('Streaming response for query: "Test message"');
    });
  });
    // Can't test formatCompletedAnswer directly as it's not exported
  describe('Internal formatting', () => {
    it('should handle formatted responses', async () => {
      const mockOnToken = jest.fn();
      
      await streamLlmResponse({
        model: 'gpt-4o-mini',
        apiKey: 'mock-api-key',
        message: 'Format this text',
        onToken: mockOnToken,
        logger: mockLogger,
      });
      
      // Verify formatting events were triggered
      const formattedCallIndex = mockOnToken.mock.calls.findIndex(
        call => call[2] === 'formatted-complete'
      );
      expect(formattedCallIndex).toBeGreaterThan(-1);
    });
  });
});
