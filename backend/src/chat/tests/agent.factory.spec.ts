import { jest } from '@jest/globals';
import { createAgent } from '../services/agent.factory';
import * as agentConfig from '../services/agent.config';
import * as tools from '../services/tools';

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    name: 'mock-llm',
  })),
}));

jest.mock('../services/tools', () => ({
  createTools: jest.fn().mockReturnValue([
    { name: 'mock_tool_1', description: 'Mock tool 1' },
    { name: 'mock_tool_2', description: 'Mock tool 2' },
  ]),
}));

jest.mock('../services/agent.config', () => ({
  configureAgent: jest.fn().mockImplementation(() => {
    return Promise.resolve({ name: 'mock-agent-executor' });
  }),
}));

describe('Agent Factory', () => {
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create an agent with the provided configuration', async () => {
    const agent = await createAgent({
      model: 'gpt-4o-mini',
      apiKey: 'mock-api-key',
      systemPrompt: 'You are a helpful assistant',
      logger: mockLogger,
    });
    
    // Check logging
    expect(mockLogger.log).toHaveBeenCalledWith('Creating agent with model: gpt-4o-mini');
    
    // Check tools were created
    expect(tools.createTools).toHaveBeenCalledWith(mockLogger);
    expect(mockLogger.log).toHaveBeenCalledWith('Registered 2 tools');
    
    // Check agent was configured
    expect(agentConfig.configureAgent).toHaveBeenCalledWith({
      llm: expect.anything(),
      tools: expect.arrayContaining([
        expect.objectContaining({ name: 'mock_tool_1' }),
        expect.objectContaining({ name: 'mock_tool_2' }),
      ]),
      systemPrompt: 'You are a helpful assistant',
    });
    
    // Check agent was returned
    expect(agent).toEqual({ name: 'mock-agent-executor' });
  });
  
  it('should handle errors during agent creation', async () => {
    const error = new Error('Failed to create agent');
    jest.spyOn(agentConfig, 'configureAgent').mockRejectedValue(error);
    
    await expect(createAgent({
      model: 'gpt-4o-mini',
      apiKey: 'mock-api-key',
      systemPrompt: 'You are a helpful assistant',
      logger: mockLogger,
    })).rejects.toThrow('Failed to create agent');
    
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to create agent: Failed to create agent');
  });
});
