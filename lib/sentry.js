/**
 * Sentry Error Monitoring Integration
 * Configures Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Initialize Sentry for error monitoring
 * Call this in your app initialization (e.g., in app/layout.jsx or next.config.mjs)
 */
export function initSentry() {
  const env = process.env.NODE_ENV || 'development';
  
  // Only enable Sentry in production
  if (env !== 'production') {
    console.log('Sentry disabled in development mode');
    return;
  }

  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.warn('SENTRY_DSN not found - Error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: env,
    
    // Set tracesSampleRate to capture a percentage of transactions
    // for performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Set profileSampleRate to capture profiling data (optional)
    profileSampleRate: 0.1, // 10% of profiles
    
    // Capture unhandled errors
    captureUnhandledRejections: true,
    
    // BeforeSend callback to filter or modify errors
    beforeSend(event, hint) {
      // Filter out certain errors if needed
      const error = hint.originalException;
      
      // Example: Don't send validation errors
      if (error && error.name === 'ValidationError') {
        return null;
      }
      
      // Add custom context
      event.context = event.context || {};
      event.context.app = {
        name: 'Affiliate Analytics Dashboard',
      };
      
      return event;
    },
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
      // Sentry.metrics.metricsAggregatorIntegration(),
      // Sentry.session Replay
      new Sentry.Replay({
        // Replay only on error
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Set replay session sample rate
    replaysSessionSampleRate: 0,
    // Set replay error sample rate
    replaysOnErrorSampleRate: 0.1, // 10% of errors
  });

  console.log('✓ Sentry error monitoring initialized');
}

/**
 * Capture an error in Sentry with additional context
 * @param {Error} error - The error object
 * @param {Object} context - Additional context data
 * @param {Object} tags - Tags for filtering in Sentry
 */
export function captureException(error, context = {}, tags = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Sentry]**trace:', error);
    console.error('[Sentry] Context:', context);
    return;
  }

  Sentry.withScope((scope) => {
    // Add context
    if (context.user) {
      scope.setUser(context.user);
    }
    
    if (context.level) {
      scope.setLevel(context.level);
    }
    
    // Add tags
    Object.entries(tags).forEach(([key, value]) => {
      scope.setTag(key, value);
    });
    
    // Add extra data
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Capture the exception
    Sentry.captureException(error);
  });
}

/**
 * Capture a message in Sentry
 * @param {string} message - The message to capture
 * @param {string} level - 'info', 'warning', 'error'
 * @param {Object} context - Additional context
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Sentry - ${level.toUpperCase()}]:`, message);
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(level);
    
    if (context.user) {
      scope.setUser(context.user);
    }
    
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for all subsequent events
 * @param {Object} user - User object with id, email, etc.
 */
export function setUserContext(user) {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb (log of an action) to the error context
 * @param {Object} breadcrumb - Breadcrumb data
 * @param {string} breadcrumb.category - Category of event (e.g., 'http', 'ui', 'auth')
 * @param {string} breadcrumb.message - Message describing the event
 * @param {string} breadcrumb.level - 'info', 'warning', 'error'
 * @param {Object} breadcrumb.data - Additional data
 */
export function addBreadcrumb(breadcrumb) {
  Sentry.addBreadcrumb({
    category: breadcrumb.category || 'custom',
    message: breadcrumb.message,
   	level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

/**
 * Capture a database error with specific context
 * @param {Error} error - The database error
 * @param {string} operation - The operation that failed
 * @param {string} collection - The collection being accessed
 */
export function captureDatabaseError(error, operation, collection) {
  captureException(error, {
    category: 'database',
    level: 'error',
    extra: {
      operation,
      collection,
      errorCode: error.code,
      errorMessage: error.message,
    },
  }, {
    database: true,
    operation: operation,
  });
}

/**
 * Capture an authentication error
 * @param {Error} error - The authentication error
 * @param {string} action - The auth action that failed
 */
export function captureAuthError(error, action) {
  captureException(error, {
    category: 'authentication',
    level: 'warning',
    extra: {
      action,
      errorMessage: error.message,
    },
  }, {
    authentication: true,
    action: action,
  });
}

/**
 * Capture an API error with request/response context
 * @param {Error} error - The API error
 * @param {Object} request - Request object
 * @param {number} statusCode - HTTP status code
 */
export function captureApiError(error, request, statusCode) {
  captureException(error, {
    category: 'api',
    level: statusCode >= 500 ? 'error' : 'warning',
    extra: {
      url: request.url,
      method: request.method,
      statusCode,
      errorMessage: error.message,
    },
  }, {
    api: true,
    status: statusCode,
    endpoint: request.url,
  });
}

export default {
  init: initSentry,
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  captureDatabaseError,
  captureAuthError,
  captureApiError,
};