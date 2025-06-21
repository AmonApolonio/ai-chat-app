import { configureAgent } from '../services/agent.config';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { AgentExecutor } from "langchain/agents";

// Mock dependencies
jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn().mockReturnValue({ name: 'mock-prompt-template' }),
  },
  MessagesPlaceholder: jest.fn(),
}));

jest.mock('langchain/agents', () => ({
  createToolCallingAgent: jest.fn().mockResolvedValue({ name: 'mock-agent' }),
  AgentExecutor: {
    fromAgentAndTools: jest.fn().mockReturnValue({ name: 'mock-agent-executor' }),
  },
}));

describe('Agent Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should configure agent with provided parameters', async () => {
    const mockLlm = { name: 'mock-llm' };
    const mockTools = [
      { name: 'tool1', description: 'tool1 description' },
      { name: 'tool2', description: 'tool2 description' }
    ];
    const mockSystemPrompt = 'You are a helpful assistant';
    
    const result = await configureAgent({
      llm: mockLlm,
      tools: mockTools,
      systemPrompt: mockSystemPrompt
    });
    
    // Check prompt template was created correctly
    expect(ChatPromptTemplate.fromMessages).toHaveBeenCalled();
    
    // Check agent was created
    expect(result).toEqual({ name: 'mock-agent-executor' });
    
    // Verify agent executor was created with correct parameters
    expect(AgentExecutor.fromAgentAndTools).toHaveBeenCalledWith({
      agent: { name: 'mock-agent' },
      tools: mockTools,
      verbose: true,
      returnIntermediateSteps: true,
      handleParsingErrors: true,
      maxIterations: 3
    });
  });
});
