import { jest } from '@jest/globals';

export const mockToolLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

export const getCurrentTimeTool = {
  name: 'get_current_time',
  description: 'Returns the current server time in ISO format.',
  call: jest.fn().mockImplementation(async () => {
    return new Date().toISOString();
  }),
};

export const getWebSearchTool = {
  name: 'web_search',
  description: 'Search the web for information.',
  call: jest.fn().mockImplementation(async (query) => {
    return `Mock search results for: ${query}`;
  }),
};

export const createTools = jest.fn().mockImplementation((logger) => {
  return [getCurrentTimeTool, getWebSearchTool];
});
