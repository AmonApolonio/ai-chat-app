import { jest } from '@jest/globals';
import { mockAgentExecutor } from './agent.config.mock';

export const createAgent = jest.fn().mockImplementation(() => {
  return Promise.resolve(mockAgentExecutor);
});
