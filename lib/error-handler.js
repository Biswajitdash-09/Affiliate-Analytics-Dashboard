/**
 * Centralized Error Handler
 * Provides consistent error handling and logging across the application
 */

import {
  captureException,
  captureMessage,
  captureDatabaseError,
  captureAuthError,
  captureApiError,
  addBreadcrumb,
  setUserContext,
} from '@/lib/sentry';

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  VALIDATION: 'ValidationError',
  DATABASE: 'DatabaseError',
  AUTHENTICATION: 'AuthenticationError',
  AUTHORIZATION: 'AuthorizationError',
  NOT_FOUND: 'NotFoundError',
  NETWORK: 'NetworkError',
  PARSING: 'ParsingError',
  UNKNOWN: 'UnknownError',
};

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = ErrorTypes.VALIDATION;
    this.details = details;
  }
}

export class DatabaseError extends Error {
  constructor(message, operation, collection) {
    super(message);
    this.name = ErrorTypes.DATABASE;
    this.operation = operation;
    this.collection = collection;
  }
}

export class AuthenticationError extends Error {
  constructor(message, action = 'authenticate') {
    super(message);
    this.name = ErrorTypes.AUTHENTICATION;
    this.action = action;
  }
}

export class AuthorizationError extends Error {
  constructor(message, resource) {
    super(message);
    this.name = ErrorTypes.AUTHORIZATION;
    this.resource = resource;
  }
}

export class NotFoundError extends Error {
  constructor(resource, identifier) {
    super(`${resource} not found`);
    this.name = ErrorTypes.NOT_FOUND;
    this.resource = resource;
    this.identifier = identifier;
  }
}

/**
 * Handle and log errors consistently
 * @param {Error} error - The error to handle
 * @param {Object} context - Additional context for error tracking
 * @param {boolean} shouldAlert - Whether to send alert (e.g., for critical errors)
 */
export function handleError(error, context = {}, shouldAlert = true) {
  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error Handler]', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // Don't track in development or test unless forced
  if (process.env.NODE_ENV !== 'production' && !shouldAlert) {
    return;
  }

  // Add breadcrumb for error tracking
  addBreadcrumb({
    category: 'error',
    message: error.message,
    level: 'error',
    data: {
      errorType: error.name,
      ...context,
    },
  });

  // Route to appropriate capture method
  switch (error.name) {
    case ErrorTypes.DATABASE:
      captureDatabaseError(error, error.operation, error.collection);
      break;

    case ErrorTypes.AUTHENTICATION:
      captureAuthError(error, error.action);
      break;

    case ErrorTypes.AUTHORIZATION:
      captureAuthError(error, `authorize ${error.resource}`);
      break;

    default:
      // Generic exception capture with full context
      captureException(error, {
        level: 'error',
        extra: {
          ...context,
          details: error.details || {},
        },
      }, {
        errorType: error.name,
      });
  }
}

/**
 * Handle API route errors and return appropriate response
 * @param {Error} error - The error
 * @param {Request} request - The request object
 * @returns {Response}
 */
export function handleApiError(error, request) {
  // Handle error
  handleError(error, {
    url: request?.url,
    method: request?.method,
  });

  // Determine status code
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: 'Internal Server Error',
  };

  switch (error.name) {
    case ErrorTypes.VALIDATION:
      statusCode = 400;
      errorResponse = {
        success: false,
        error: error.message,
        details: error.details,
      };
      break;

    case ErrorTypes.AUTHENTICATION:
      statusCode = 401;
      errorResponse = {
        success: false,
        error: error.message || 'Authentication required',
      };
      break;

    case ErrorTypes.AUTHORIZATION:
      statusCode = 403;
      errorResponse = {
        success: false,
        error: error.message || 'Access denied',
      };
      break;

    case ErrorTypes.NOT_FOUND:
      statusCode = 404;
      errorResponse = {
        success: false,
        error: error.message,
      };
      break;

    case ErrorTypes.DATABASE:
      statusCode = 503;
      errorResponse = {
        success: false,
        error: 'Database error occurred',
      };
      break;

    default:
      statusCode = 500;
      errorResponse = {
        success: false,
        error: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : error.message,
      };
  }

  const { NextResponse } = require('next/server');
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Validate data against a schema and throw ValidationError if invalid
 * @param {Object} data - Data to validate
 * @param {Function} validator - Validation function that returns null if valid or error message
 * @param {string} errorMessage - Custom error message
 */
export function validateOrThrow(data, validator, errorMessage = 'Validation failed') {
  const error = validator(data);
  if (error) {
    throw new ValidationError(errorMessage || error, { validationError: error });
  }
}

/**
 * Async wrapper to catch and handle errors in async functions
 * @param {Function} fn - Async function to wrap
 * @param {Request} request - Request object for error handling
 * @returns {Promise} - Promise that resolves to Response or Error
 */
export function asyncHandler(fn, request) {
  return fn().catch((error) => {
    return handleApiError(error, request);
  });
}

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
export function setUserForErrorTracking(user) {
  if (user) {
    setUserContext({
      id: user._id || user.id,
      email: user.email,
      role: user.role,
    });
  }
}

/**
 * Clear user context on logout
 */
export function clearUserForErrorTracking() {
  setUserContext(null);
}

/**
 * Log a warning message (non-critical)
 * @param {string} message - Warning message
 * @param {Object} context - Context data
 */
export function logWarning(message, context = {}) {
  console.warn('[Warning]', message, context);

  if (process.env.NODE_ENV === 'production') {
    captureMessage(message, 'warning', context);
  }
}

/**
 * Log an info message
 * @param {string} message - Info message
 * @param {Object} context - Context data
 */
export function logInfo(message, context = {}) {
  console.log('[Info]', message, context);

  if (process.env.NODE_ENV === 'production') {
    captureMessage(message, 'info', context);
  }
}

/**
 * Log an error message
 * @param {string} message - Error message
 * @param {Object} context - Context data
 */
export function logError(message, context = {}) {
  console.error('[Error]', message, context);

  if (process.env.NODE_ENV === 'production') {
    captureMessage(message, 'error', context);
  }
}

export default {
  ErrorTypes,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  handleError,
  handleApiError,
  validateOrThrow,
  asyncHandler,
  setUserForErrorTracking,
  clearUserForErrorTracking,
  logWarning,
  logInfo,
  logError,
};