import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window / token bucket per client IP & action key
const ipLimiterStore = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically
setInterval(() => {
  const now = Date.now();
  ipLimiterStore.forEach((record, key) => {
    if (record.resetAt <= now) {
      ipLimiterStore.delete(key);
    }
  });
}, 60000);

export function getClientIp(request: NextRequest): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }
  return '127.0.0.1';
}

export interface RateLimitOptions {
  limit: number;       // Max requests
  windowSeconds: number; // Time window in seconds
}

export function checkRateLimit(
  request: NextRequest,
  actionKey: string,
  options: RateLimitOptions = { limit: 10, windowSeconds: 60 }
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const ip = getClientIp(request);
  const key = `${actionKey}:${ip}`;
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  const record = ipLimiterStore.get(key);

  if (!record || record.resetAt <= now) {
    // New window
    ipLimiterStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: options.limit - 1,
      resetInSeconds: options.windowSeconds,
    };
  }

  if (record.count >= options.limit) {
    const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds,
    };
  }

  record.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  return {
    allowed: true,
    remaining: options.limit - record.count,
    resetInSeconds,
  };
}
