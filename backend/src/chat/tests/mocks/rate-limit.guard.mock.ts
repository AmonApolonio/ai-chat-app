import { jest } from '@jest/globals';

export class MockRateLimitGuard {
  canActivate = jest.fn().mockReturnValue(true);
}
