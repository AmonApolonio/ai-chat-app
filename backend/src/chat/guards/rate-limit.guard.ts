import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RateLimitGuard implements CanActivate {
  // Simple in-memory storage for rate limiting
  private requestMap: Map<string, number[]> = new Map();
  private readonly requestLimit = 5; // 5 requests per minute
  private readonly windowMs = 60 * 1000; // 1 minute in milliseconds

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;
    
    const now = Date.now();
    const requestTimestamps = this.requestMap.get(clientIp) || [];
    
    // Filter out outdated requests
    const recentRequests = requestTimestamps.filter(
      timestamp => now - timestamp < this.windowMs
    );

    // Add current request timestamp
    recentRequests.push(now);
    this.requestMap.set(clientIp, recentRequests);
    
    // Check if the request count exceeds the limit
    if (recentRequests.length > this.requestLimit) {
      throw new HttpException(
        'Too many requests, please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    return true;
  }
}
