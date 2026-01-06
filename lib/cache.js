/**
 * Redis Caching Layer
 * Provides caching functionality for frequently accessed data
 */

import { createClient } from 'redis';
import { logWarning, logInfo } from '@/lib/error-handler';

// Cache configuration
const CACHE_CONFIG = {
  // Default TTL for cached items (in seconds)
  defaultTTL: 300, // 5 minutes
  
  // TTL for different data types
  TTL: {
    USER_DATA: 3600, // 1 hour
    AFFILIATE_PROFILE: 1800, // 30 minutes
    CAMPAIGNS: 300, // 5 minutes
    ANALYTICS: 60, // 1 minute (short cache for frequently updated data)
    GLOBAL_SETTINGS: 3600, // 1 hour
    LEADERBOARDS: 120, // 2 minutes
  },
  
  // Cache key prefixes
  PREFIXES: {
    USER: 'user',
    AFFILIATE: 'affiliate',
    CAMPAIGN: 'campaign',
    ANALYTICS: 'analytics',
    SETTINGS: 'settings',
    LEADERBOARD: 'leaderboard',
  },
  
  // Enable/disable caching
  enabled: process.env.REDIS_ENABLED !== 'false',
};

// Redis client instance
let redisClient = null;
let isConnected = false;
let connectionPromise = null;

/**
 * Create and configure Redis client
 */
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis reconnection failed after 10 retries');
          return new Error('Redis reconnection failed');
        }
        return retries * 100; // Exponential backoff
      },
    },
  });

  // Error handling
  client.on('error', (error) => {
    console.error('Redis Client Error:', error);
    isConnected = false;
  });

  client.on('connect', () => {
    console.log('✓ Redis client connected');
    isConnected = true;
  });

  client.on('disconnect', () => {
    console.log('Redis client disconnected');
    isConnected = false;
  });

  client.on('reconnecting', () => {
    console.log('Redis client reconnecting...');
  });

  return client;
}

/**
 * Get Redis client instance (singleton)
 */
export async function getRedisClient() {
  if (!CACHE_CONFIG.enabled) {
    return null;
  }

  if (redisClient && isConnected) {
    return redisClient;
  }

  // If connection attempt is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Create new connection
  connectionPromise = connectRedis();
  return connectionPromise;
}

/**
 * Connect to Redis
 */
async function connectRedis() {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
    isConnected = true;
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    isConnected = false;
    connectionPromise = null;
    return null;
  }
}

/**
 * Generate a cache key with prefix
 */
function generateCacheKey(prefix, identifier, ...parts) {
  const keyParts = [prefix, identifier, ...parts].filter(Boolean);
  return keyParts.join(':');
}

/**
 * Set a value in cache with TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds
 */
export async function cacheSet(key, value, ttl = CACHE_CONFIG.defaultTTL) {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    return false;
  }

  try {
    const client = await getRedisClient();
    if (!client) return false;

    const serialized = JSON.stringify(value);
    await client.setEx(key, ttl, serialized);
    return true;
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error);
    return false;
  }
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<* | null>} Cached value or null if not found
 */
export async function cacheGet(key) {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    return null;
  }

  try {
    const client = await getRedisClient();
    if (!client) return null;

    const data = await client.get(key);
    if (data === null) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Delete a value from cache
 * @param {string} key - Cache key
 */
export async function cacheDel(key) {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    return false;
  }

  try {
    const client = await getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Pattern (e.g., "analytics:*")
 */
export async function cacheDelPattern(pattern) {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    const keys = [];
    for await (const key of client.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(key);
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.error(`Cache delete pattern error for ${pattern}:`, error);
  }
}

/**
 * Check cache health
 */
export async function cacheHealthCheck() {
  if (!CACHE_CONFIG.enabled) {
    return { status: 'disabled' };
  }

  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: 'not_connected' };
    }

    await client.ping();
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

/**
 * Cache helper for user data
 */
export const UserCache = {
  /**
   * Get user from cache
   */
  async get(userId) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.USER, userId);
    return await cacheGet(key);
  },

  /**
   * Set user in cache
   */
  async set(userId, user) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.USER, userId);
    return await cacheSet(key, user, CACHE_CONFIG.TTL.USER_DATA);
  },

  /**
   * Remove user from cache
   */
  async delete(userId) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.USER, userId);
    return await cacheDel(key);
  },
};

/**
 * Cache helper for affiliate profiles
 */
export const AffiliateCache = {
  /**
   * Get affiliate profile from cache
   */
  async get(affiliateId) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.AFFILIATE,
      'profile',
      affiliateId
    );
    return await cacheGet(key);
  },

  /**
   * Set affiliate profile in cache
   */
  async set(affiliateId, profile) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.AFFILIATE,
      'profile',
      affiliateId
    );
    return await cacheSet(key, profile, CACHE_CONFIG.TTL.AFFILIATE_PROFILE);
  },

  /**
   * Remove affiliate profile from cache
   */
  async delete(affiliateId) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.AFFILIATE,
      'profile',
      affiliateId
    );
    return await cacheDel(key);
  },
};

/**
 * Cache helper for campaigns
 */
export const CampaignCache = {
  /**
   * Get all campaigns from cache
   */
  async getAll() {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.CAMPAIGN, 'all');
    return await cacheGet(key);
  },

  /**
   * Set all campaigns in cache
   */
  async setAll(campaigns) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.CAMPAIGN, 'all');
    return await cacheSet(key, campaigns, CACHE_CONFIG.TTL.CAMPAIGNS);
  },

  /**
   * Get campaign by ID
   */
  async get(campaignId) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.CAMPAIGN, campaignId);
    return await cacheGet(key);
  },

  /**
   * Set campaign in cache
   */
  async set(campaignId, campaign) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.CAMPAIGN, campaignId);
    return await cacheSet(key, campaign, CACHE_CONFIG.TTL.CAMPAIGNS);
  },

  /**
   * Invalidate campaigns cache
   */
  async invalidate() {
    await cacheDelPattern(`${CACHE_CONFIG.PREFIXES.CAMPAIGN}:*`);
  },
};

/**
 * Cache helper for analytics
 */
export const AnalyticsCache = {
  /**
   * Get analytics data from cache
   */
  async get(type, params) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.ANALYTICS,
      type,
      JSON.stringify(params)
    );
    return await cacheGet(key);
  },

  /**
   * Set analytics data in cache
   */
  async set(type, params, data) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.ANALYTICS,
      type,
      JSON.stringify(params)
    );
    return await cacheSet(key, data, CACHE_CONFIG.TTL.ANALYTICS);
  },

  /**
   * Get leaderboards from cache
   */
  async getLeaderboards() {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.LEADERBOARD,
      'all'
    );
    return await cacheGet(key);
  },

  /**
   * Set leaderboards in cache
   */
  async setLeaderboards(data) {
    const key = generateCacheKey(
      CACHE_CONFIG.PREFIXES.LEADERBOARD,
      'all'
    );
    return await cacheSet(key, data, CACHE_CONFIG.TTL.LEADERBOARDS);
  },

  /**
   * Invalidate analytics cache
   */
  async invalidate(type) {
    if (type) {
      await cacheDelPattern(`${CACHE_CONFIG.PREFIXES.ANALYTICS}:${type}*`);
    } else {
      await cacheDelPattern(`${CACHE_CONFIG.PREFIXES.ANALYTICS}:*`);
    }
  },
};

/**
 * Cache helper for global settings
 */
export const SettingsCache = {
  /**
   * Get global settings from cache
   */
  async get() {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.SETTINGS, 'global');
    return await cacheGet(key);
  },

  /**
   * Set global settings in cache
   */
  async set(settings) {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.SETTINGS, 'global');
    return await cacheSet(key, settings, CACHE_CONFIG.TTL.GLOBAL_SETTINGS);
  },

  /**
   * Invalidate settings cache
   */
  async invalidate() {
    const key = generateCacheKey(CACHE_CONFIG.PREFIXES.SETTINGS, 'global');
    return await cacheDel(key);
  },
};

/**
 * Function to cache and retrieve data automatically
 */
export async function withCache(key, fetchFn, ttl = CACHE_CONFIG.defaultTTL) {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    // If Redis is disabled, just fetch fresh data
    return await fetchFn();
  }

  // Try to get from cache
  const cached = await cacheGet(key);
  if (cached !== null) {
    logInfo('Cache hit', { key });
    return cached;
  }

  // Perform fetch
  logInfo('Cache miss', { key });
  const data = await fetchFn();

  // Cache the result
  await cacheSet(key, data, ttl);

  return data;
}

/**
 * Clear all cache (use with caution!)
 */
export async function cacheFlushAll() {
  if (!CACHE_CONFIG.enabled || !isConnected) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.flushDb();
    logInfo('Cache flushed');
  } catch (error) {
    console.error('Cache flush error:', error);
  }
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection() {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      isConnected = false;
      connectionPromise = null;
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

export default {
  CACHE_CONFIG,
  getRedisClient,
  cacheSet,
  cacheGet,
  cacheDel,
  cacheDelPattern,
  cacheHealthCheck,
  UserCache,
  AffiliateCache,
  CampaignCache,
  AnalyticsCache,
  SettingsCache,
  withCache,
  cacheFlushAll,
  closeRedisConnection,
};