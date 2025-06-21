import { Test } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from '../guards/rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [RateLimitGuard],
    }).compile();
    
    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });
  
  it('should allow request if under rate limit', () => {
    // Create mock execution context
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          ip: '127.0.0.1',
        }),
      }),
    } as unknown as ExecutionContext;
    
    // First request should be allowed
    expect(guard.canActivate(mockContext)).toBe(true);
    
    // Multiple requests under the limit should be allowed
    for (let i = 0; i < 4; i++) {
      expect(guard.canActivate(mockContext)).toBe(true);
    }
  });
  
  it('should block requests if over rate limit', () => {
    // Create mock execution context
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          ip: '192.168.1.1',
        }),
      }),
    } as unknown as ExecutionContext;
    
    // Make requests up to the limit
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(mockContext)).toBe(true);
    }
    
    // The next request should throw an exception
    try {
      guard.canActivate(mockContext);
      fail('Expected HttpException to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(error.message).toBe('Too many requests, please try again later.');
    }
  });
  
  it('should reset rate limit after window expires', async () => {
    // Mock Date.now to control time
    const originalNow = Date.now;
    const mockTime = 1625097600000; // Some fixed timestamp
    
    try {
      // Set initial time
      Date.now = jest.fn().mockReturnValue(mockTime);
      
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            ip: '10.0.0.1',
          }),
        }),
      } as unknown as ExecutionContext;
      
      // Make 5 requests (up to limit)
      for (let i = 0; i < 5; i++) {
        expect(guard.canActivate(mockContext)).toBe(true);
      }
      
      // Advance time by 61 seconds (just past the window)
      Date.now = jest.fn().mockReturnValue(mockTime + 61000);
      
      // Should be able to make requests again
      expect(guard.canActivate(mockContext)).toBe(true);
    } finally {
      // Restore original Date.now
      Date.now = originalNow;
    }
  });
});
