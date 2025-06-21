import { jest } from '@jest/globals';

class MockAgentExecutor {
  async call(input) {
    return {
      output: `Mock response for: ${input.input}`,
      intermediateSteps: [
        {
          action: {
            tool: 'get_current_time',
            toolInput: {},
          },
          observation: new Date().toISOString(),
        },
        {
          action: {
            tool: 'web_search',
            toolInput: { query: input.input },
          },
          observation: 'Mock search results for: ' + input.input,
        },
      ],
    };
  }
}

export const mockAgentExecutor = new MockAgentExecutor();

export const configureAgent = jest.fn().mockImplementation(() => {
  return Promise.resolve(mockAgentExecutor);
});

export const mockAgent = {
  invoke: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      content: 'Mock agent response',
    });
  })
};

export const createToolCallingAgent = jest.fn().mockImplementation(() => {
  return Promise.resolve(mockAgent);
});
