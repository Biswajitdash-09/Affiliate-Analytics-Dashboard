/**
 * Rate Limiting Middleware
 * Protects APIs from abuse and DOS attacks using sliding window algorithm
 */

/**
 * Rate limit configurations for different routes/operations
 */
export const RateLimitConfig = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Max 5 requests
    message: 'Too many login attempts, please try again later',
  },
  
  // General API endpoints
  api: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 100, // Max 100 requests per minute
    message: 'Too many requests, please slow down',
  },
  
  // Analytics endpoints - generous limits for dashboard
  analytics: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 60, // Max 60 requests per minute
    message: 'Analytics quota exceeded',
  },
  
  // Tracking endpoints - high limits for legitimate traffic
  tracking: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000, // Max 1000 requests per minute
    message: 'Tracking quota exceeded',
  },
  
  // Public endpoints - moderate limits
  public: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 30, // Max 30 requests per minute
    message: 'Too many requests from this IP',
  },
  
  // Admin operations - per-user limits
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50, // Max 50 requests
    message: 'Admin operation quota exceeded',
  },
};

/**
 * In-memory store for rate limiting (for development/small deployments)
 * For production, use Redis (see RedisStore below)
 */
class MemoryStore {
  constructor() {
    this.requests = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Get current count for a key
   */
  get(key) {
    const data = this.requests.get(key);
    if (!data) {
      return { count: 0, resetTime: Date.now() + 60000 };
    }
    return data;
  }

  /**
   * Increment count for a key
   */
  increment(key) {
    const data = this.requests.get(key) || {
      count: 0,
      resetTime: Date.now() + 60000,
    };
    data.count += 1;
    this.requests.set(key, data);
    return data;
  }

  /**
   * Reset count for a key
   */
  reset(key) {
    this.requests.delete(key);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (data.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all entries (for testing)
   */
  clear() {
    this.requests.clear();
  }
}

// Create singleton instance
const memoryStore = new MemoryStore();

/**
 * Redis-based store for distributed rate limiting
 * Requires Redis connection
 */
class RedisStore {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async get(key) {
    try {
      const data = await this.redis.get(`ratelimit:${key}`);
      if (!data) {
        return { count: 0, resetTime: Date.now() + 60000 };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Redis get error:', error);
      return { count: 0, resetTime: Date.now() + 60000 };
    }
  }

  async increment(key, windowMs) {
    try {
      const now = Date.now();
      const resetTime = now + windowMs;
      const pipeline = this.redis.pipeline();
      
      // Increment counter
      const redisKey = `ratelimit:${key}`;
      pipeline.incr(redisKey);
      
      // Set expiry
      pipeline.pexpire(redisKey, windowMs);
      
      // Get value
      pipeline.get(redisKey);
      
      const results = await pipeline.exec();
      const count = parseInt(results[2][1] || '0');
      
      return { count, resetTime };
    } catch (error) {
      console.error('Redis increment error:', error);
      return { count: 0, resetTime: Date.now() + windowMs };
    }
  }

  async reset(key) {
    try {
      await this.redis.del(`ratelimit:${key}`);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
}

/**
 * Extract identifier for rate limiting
 * Priority: User ID -> IP Address
 */
function extractIdentifier(request) {
  // Try to get user ID from token (if authenticated)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback');
      if (decoded.id || decoded.userId) {
        return `user:${decoded.id || decoded.userId}`;
      }
    } catch (error) {
      // Invalid token, fall back to IP
    }
  }

  // Fall back to IP address
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown';

  return `ip:${ip}`;
}

/**
 * Create a rate limiting middleware
 * @param {Object} config - Rate limit configuration
 * @param {string} keyPrefix - Prefix for the rate limit key
 * @returns {Function} Middleware function
 */
export function createRateLimit(config, keyPrefix = 'default') {
  const { windowMs, maxRequests, message } = config;
  const store = process.env.REDIS_URL ? memoryStore : memoryStore; // Use Redis in production

  return async function rateLimit(request) {
    const identifier = extractIdentifier(request);
    const key = `${keyPrefix}:${identifier}`;

    // Get current data
    const data = await store.get(key);

    // Check if window has expired
    if (data && data.resetTime < Date.now()) {
      store.reset(key);
    }

    // Get fresh data
    const currentData = await store.get(key);

    // Check if limit exceeded
    if (currentData.count >= maxRequests) {
      const retryAfter = Math.max(0, Math.ceil((currentData.resetTime - Date.now()) / 1000));
      
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        reset: currentData.resetTime,
        retryAfter,
      };
    }

    // Increment counter
    const newData = await store.increment(key, windowMs);

    // Return success
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - newData.count,
      reset: newData.resetTime,
    };
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 * Usage: Wrap your route handler
 */
export function withRateLimit(config, keyPrefix) {
  const rateLimiter = createRateLimit(config, keyPrefix);

  return async function rateLimitMiddleware(request) {
    const result = await rateLimiter(request);

    if (!result.allowed) {
      const { NextResponse } = require('next/server');
      
      return NextResponse.json(
        {
          success: false,
          error: config.message || 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        },
        {
          status: 429, // Too Many Requests
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': result.retryAfter.toString(),
          },
        }
      );
    }

    // Attach rate limit info to request for use in route handler
    request.rateLimit = {
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };

    // Return null to indicate success (route handler will be called)
    return null;
  };
}

/**
 * Express.js style middleware wrapper
 * @param {Function} handler - Next.js route handler
 * @param {Object} config - Rate limit configuration
 * @returns {Function} Wrapped handler
 */
export function rateLimitHandler(handler, config, keyPrefix) {
  const middleware = withRateLimit(config, keyPrefix);

  return async function(request) {
    const rateLimitResponse = await middleware(request);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request);
  };
}

/**
 * Clean up resources (call when shutting down)
 */
export function cleanup() {
  if (memoryStore.cleanupInterval) {
    clearInterval(memoryStore.cleanupInterval);
  }
}

export default {
  RateLimitConfig,
  createRateLimit,
  withRateLimit,
  rateLimitHandler,
  cleanup,
};