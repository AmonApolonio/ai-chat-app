import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '../services/agent.service';
import * as agentFactory from '../services/agent.factory';
import * as agentLlm from '../services/agent.llm';

// Setup mocks
jest.mock('../services/agent.factory', () => ({
  createAgent: jest.fn().mockResolvedValue({
    call: jest.fn().mockResolvedValue({
      output: 'Mock response',
      intermediateSteps: [
        {
          action: {
            tool: 'get_current_time',
            toolInput: {},
          },
          observation: '2025-06-20T12:00:00Z',
        }
      ]
    }),
  }),
}));

jest.mock('../services/agent.llm', () => ({
  streamLlmResponse: jest.fn().mockImplementation(async ({ onToken }) => {
    onToken('Mock streaming response', false, 'streaming');
    onToken('', true, 'streaming-complete');
    onToken('Mock formatted response', true, 'formatted-complete');
    return Promise.resolve();
  }),
}));

describe('AgentService', () => {
  let service: AgentService;
  let configService: ConfigService;
  let mockCreateAgent: jest.SpyInstance;
  let mockStreamLlmResponse: jest.SpyInstance;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key, defaultValue) => {
              if (key === 'LLM_API_KEY') return 'mock-api-key';
              if (key === 'LLM_MODEL') return defaultValue || 'gpt-4o-mini';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();
    
    service = module.get<AgentService>(AgentService);
    configService = module.get<ConfigService>(ConfigService);
    
    mockCreateAgent = jest.spyOn(agentFactory, 'createAgent');
    mockStreamLlmResponse = jest.spyOn(agentLlm, 'streamLlmResponse');
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  it('should initialize with correct configuration', () => {
    expect(configService.get).toHaveBeenCalledWith('LLM_API_KEY');
    expect(configService.get).toHaveBeenCalledWith('LLM_MODEL', 'gpt-4o-mini');
    expect(mockCreateAgent).toHaveBeenCalled();
  });
  
  describe('streamResponse', () => {
    it('should stream a response and handle tool executions', async () => {
      const mockOnToken = jest.fn();
      await service.streamResponse('What is the current time?', [], mockOnToken);
      
      // Verify the agent execution was called
      const agentExecutor = await mockCreateAgent.mock.results[0].value;
      expect(agentExecutor.call).toHaveBeenCalledWith({
        input: 'What is the current time?',
        chat_history: [],
        signal: undefined
      });
      
      // Verify streamLlmResponse was called
      expect(mockStreamLlmResponse).toHaveBeenCalled();
      
      // Verify correct events were sent
      expect(mockOnToken).toHaveBeenCalledWith('', false, 'researching');
      expect(mockOnToken).toHaveBeenCalledWith('', false, 'streaming');
    });
    
    it('should handle missing API key', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'LLM_API_KEY') return undefined;
        return 'gpt-4o-mini';
      });
      
      // Re-instantiate service with missing API key
      const module = await Test.createTestingModule({
        providers: [
          AgentService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();
      
      const serviceWithNoApiKey = module.get<AgentService>(AgentService);
      const mockOnToken = jest.fn();
      
      await serviceWithNoApiKey.streamResponse('Test message', [], mockOnToken);
      
      expect(mockOnToken).toHaveBeenCalledWith(
        'API key not configured. Please set the LLM_API_KEY environment variable.',
        true
      );
    });
  });
  
  describe('streamPdfResponse', () => {
    it('should stream a response for PDF content', async () => {
      const mockOnToken = jest.fn();
      await service.streamPdfResponse(
        'What does this PDF say?',
        'Mock PDF content',
        mockOnToken
      );
      
      // Verify streamLlmResponse was called with PDF content
      expect(mockStreamLlmResponse).toHaveBeenCalledWith(expect.objectContaining({
        message: 'What does this PDF say?',
        systemPrompt: expect.stringContaining('Mock PDF content')
      }));
      
      // Verify streaming event was sent
      expect(mockOnToken).toHaveBeenCalledWith('', false, 'streaming');
    });
  });
});
