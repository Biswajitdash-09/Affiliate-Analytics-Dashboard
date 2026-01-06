import { MongoClient } from 'mongodb';
import { initUserIndexes } from '@/models/User';
import { initAffiliateProfileIndexes } from '@/models/AffiliateProfile';
import { initCampaignIndexes } from '@/models/Campaign';
import { initShortLinkIndexes } from '@/models/ShortLink';
import { captureDatabaseError } from '@/lib/sentry';
import { logWarning, logInfo } from '@/lib/error-handler';

// Database configuration with connection pooling optimization
const DB_CONFIG = {
  // Connection pool settings
  minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2'),
  maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10'),
  maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME || '30000'), // 30 seconds
  
  // Connection timeout settings
  serverSelectionTimeoutMS: parseInt(process.env.DB_SELECTION_TIMEOUT || '5000'), // 5 seconds
  connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000'), // 10 seconds
  
  // Socket settings
  socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT || '45000'), // 45 seconds
  
  // Retry settings
  maxConnecting: parseInt(process.env.DB_MAX_CONNECTING || '5'),
  
  // Retry writes for reliability
  retryWrites: process.env.RETRY_WRITES !== 'false',
  retryReads: process.env.DB_RETRY_READS !== 'false',
  
  // Database name
  dbName: process.env.MONGODB_DB || 'affiliate_analytics',
};

const uri = process.env.MONGODB_URI;
let client;
let clientPromise;
let isIndexInitialized = false;

// Enhanced connection options with pooling
const options = {
  minPoolSize: DB_CONFIG.minPoolSize,
  maxPoolSize: DB_CONFIG.maxPoolSize,
  maxIdleTimeMS: DB_CONFIG.maxIdleTimeMS,
  serverSelectionTimeoutMS: DB_CONFIG.serverSelectionTimeoutMS,
  connectTimeoutMS: DB_CONFIG.connectTimeoutMS,
  socketTimeoutMS: DB_CONFIG.socketTimeoutMS,
  maxConnecting: DB_CONFIG.maxConnecting,
  retryWrites: DB_CONFIG.retryWrites,
  retryReads: DB_CONFIG.retryReads,
  
  // Monitor connection events
  monitorCommands: process.env.NODE_ENV === 'development',
};

if (uri) {
  // Validation to prevent MongoParseError
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    if (process.env.NODE_ENV === 'development') {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        
        // Set up event listeners for monitoring
        setupClientListeners(client);
        
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      // In production mode, it's best to not use a global variable.
      client = new MongoClient(uri, options);
      
      // Set up event listeners for monitoring
      setupClientListeners(client);
      
      clientPromise = client.connect();
    }
  } else {
    console.error('Invalid MONGODB_URI: It must start with "mongodb://" or "mongodb+srv://"');
  }
} else {
  console.error('MONGODB_URI is not set in environment variables');
}

/**
 * Set up client event listeners for monitoring
 */
function setupClientListeners(mongoClient) {
  mongoClient.on('connected', () => {
    logInfo('MongoDB connected successfully', {
      minPoolSize: DB_CONFIG.minPoolSize,
      maxPoolSize: DB_CONFIG.maxPoolSize,
    });
  });

  mongoClient.on('disconnected', () => {
    logWarning('MongoDB disconnected');
  });

  mongoClient.on('error', (err) => {
    captureDatabaseError(err, 'connection_error', 'mongodb');
  });

  mongoClient.on('close', () => {
    logInfo('MongoDB connection closed');
  });

  mongoClient.on('timeout', () => {
    logWarning('MongoDB operation timed out');
  });

  // Command monitoring (development only)
  if (options.monitorCommands) {
    mongoClient.on('commandStarted', (event) => {
      console.debug(`MongoDB command: ${event.commandName}`);
    });
  }
}

/**
 * Get server status information (useful for health checks)
 */
export async function getServerStatus() {
  try {
    if (!clientPromise) {
      return null;
    }

    const connectedClient = await clientPromise;
    const db = connectedClient.db(DB_CONFIG.dbName);
    
    const status = await db.admin().ping();
    
    return {
      ok: status.ok,
      host: db.s.client.options.hosts?.[0]?.host || 'unknown',
      connected: true,
      poolSize: {
        min: DB_CONFIG.minPoolSize,
        max: DB_CONFIG.maxPoolSize,
      },
    };
  } catch (error) {
    return {
      ok: 0,
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Get connection pool statistics
 */
export async function getPoolStats() {
  try {
    if (!client) {
      return null;
    }

    return {
      waiting: client.options.maxConnecting || DB_CONFIG.maxConnecting,
      checkedOut: client.s.pool?.checkedOut || 0,
      available: client.s.pool?.available || 0,
      total: client.s.pool?.total || 0,
    };
  } catch (error) {
    return null;
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

/**
 * Get database instance with connection pooling optimization
 * Useful for cleaner code in API routes.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  if (!uri) {
    throw new Error('Please add your Mongo URI to .env');
  }

  if (!clientPromise) {
    throw new Error('MongoDB client is not initialized. Check your MONGODB_URI configuration.');
  }

  const startTime = Date.now();
  const connectedClient = await clientPromise;
  const connectionTime = Date.now() - startTime;
  
  // Log slow connection
  if (connectionTime > 1000) {
    logWarning('Slow database connection detected', { connectionTime });
  }
  
  const db = connectedClient.db(DB_CONFIG.dbName);

  // Initialize indexes only once (lazy initialization)
  if (!isIndexInitialized) {
    // Perform index initialization asynchronously without blocking
    initializeIndexes(db).catch((error) => {
      captureDatabaseError(error, 'index_initialization', ' mongodb');
    });
  }

  return db;
}

/**
 * Initialize database indexes
 */
async function initializeIndexes(db) {
  try {
    logInfo('Initializing database indexes...');
    
    const startTime = Date.now();
    
    // Initialize all model indexes in parallel
    await Promise.all([
      initUserIndexes(db).catch((err) => {
        logWarning('Failed to initialize user indexes', { error: err.message });
        return null;
      }),
      initAffiliateProfileIndexes(db).catch((err) => {
        logWarning('Failed to initialize affiliate profile indexes', { error: err.message });
        return null;
      }),
      initCampaignIndexes(db).catch((err) => {
        logWarning('Failed to initialize campaign indexes', { error: err.message });
        return null;
      }),
      initShortLinkIndexes(db).catch((err) => {
        logWarning('Failed to initialize short link indexes', { error: err.message });
        return null;
      }),
    ]);
    
    const duration = Date.now() - startTime;
    logInfo('Database indexes initialized', { duration });
    
    isIndexInitialized = true;
  } catch (error) {
    captureDatabaseError(error, 'index_initialization', 'mongodb');
    logWarning('Database index initialization encountered errors', { error: error.message });
  }
}

/**
 * Perform a database health check
 */
export async function healthCheck() {
  try {
    const status = await getServerStatus();
    
    if (!status) {
      return { healthy: false, error: 'No database connection' };
    }
    
    if (!status.connected) {
      return { healthy: false, error: 'Database not connected' };
    }
    
    // Test read operation
    const db = await getDb();
    await db.admin().ping();
    
    return {
      healthy: true,
      status,
      poolStats: await getPoolStats(),
    };
  } catch (error) {
    captureDatabaseError(error, 'health_check', 'mongodb');
    return {
      healthy: false,
      error: error.message,
    };
  }
}

/**
 * Close database connection gracefully
 */
export async function closeConnection() {
  try {
    if (client) {
      await client.close();
      logInfo('MongoDB connection closed successfully');
      
      if (typeof global !== 'undefined' && global._mongoClientPromise) {
        delete global._mongoClientPromise;
      }
    }
  } catch (error) {
    captureDatabaseError(error, 'close_connection', 'mongodb');
    logWarning('Error closing database connection', { error: error.message });
  }
}

/**
 * Execute database operation with retry logic
 * @param {Function} operation - Database operation to execute
 * @param {Object} options - Retry options
 */
export async function withRetry(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    backoffMultiplier = 2,
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      const nonRetryableErrors = [
        'MongoTimeoutError',
        'MongoNetworkTimeoutError',
      ];

      if (nonRetryableErrors.includes(error.name)) {
        throw error;
      }

      // If this was the last attempt, throw
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retrying
      logInfo(`Database operation failed, retrying (attempt ${attempt + 1}/${maxRetries})`, {
        error: error.message,
        delay,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Get database configuration (for debugging/logging)
 */
export function getDBConfig() {
  return {
    ...DB_CONFIG,
    hasURI: !!uri,
    hasClient: !!client,
    hasClientPromise: !!clientPromise,
    isIndexInitialized,
  };
}

// Export DB_CONFIG for use in other modules
export { DB_CONFIG };