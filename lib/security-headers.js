/**
 * Security Headers Configuration
 * Implements enhanced security headers to protect against web vulnerabilities
 */

/**
 * Content Security Policy (CSP)
 * Defines which resources can be loaded and executed
 */
const getCSP = () => {
  const isDev = process.env.NODE_ENV === 'development';

  // Development mode is more permissive
  if (isDev) {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://cdn.jsdelivr.net",
      "connect-src 'self' https://api.stripe.com",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ');
  }

  // Production mode is strict but needs to allow Next.js internal scripts/styles
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net",
    "script-src-elem 'self' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src-elem 'self' https://cdn.jsdelivr.net",
    "img-src 'self' data: https: blob:",
    "font-src 'self' https://cdn.jsdelivr.net",
    "connect-src 'self' https://api.stripe.com",
    "media-src 'self'",
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join('; ');
};

/**
 * Get all security headers for Next.js responses
 * @returns {Object} Headers object with security headers
 */
export function getSecurityHeaders() {
  const isDev = process.env.NODE_ENV === 'development';
  const nonce = isDev ? 'development-nonce' : 'production-nonce';

  return {
    // Content Security Policy
    'Content-Security-Policy': getCSP(),

    // Prevents clickjacking attacks
    'X-Frame-Options': 'DENY',

    // Prevents MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // Enables XSS protection in modern browsers
    'X-XSS-Protection': '1; mode=block',

    // Tells browser to only use HTTPS for next 2 years (production only)
    'Strict-Transport-Security': isDev ? 'max-age=0' : 'max-age=63072000; includeSubDomains; preload',

    // Controls how much referrer info is sent
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Disables browser features that could be exploited
    'Permissions-Policy': [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'document-domain=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=(self)',
      'picture-in-picture=(self)',
      'publickey-credentials-get=(self)',
      'screen-wake-lock=()',
      'sync-xhr=(self)',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ].join(', '),

    // Prevents caching of sensitive data
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',

    // Note: 'nosniff' belongs to X-Content-Type-Options (already set above).
    // Content-Disposition should NOT be set for page responses.

    // Additional security
    // 'Cross-Origin-Embedder-Policy': 'require-corp',
    // 'Cross-Origin-Opener-Policy': 'same-origin',
    // 'Cross-Origin-Resource-Policy': 'same-origin',
  };
}

/**
 * Apply security headers to a Next.js Response
 * @param {Response} response - The Next.js response object
 * @returns {Response} Response with security headers applied
 */
export function applySecurityHeaders(response) {
  if (!response || !response.headers) {
    return response;
  }

  const headers = getSecurityHeaders();

  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}

/**
 * Middleware wrapper for Next.js routes to apply security headers
 * Usage in route handlers:
 * export async function GET(request) {
 *   const response = NextResponse.json(data);
 *   return applySecurityHeaders(response);
 * }
 */
export function withSecurityHeaders(handler) {
  return async function (request) {
    const response = await handler(request);
    return applySecurityHeaders(response);
  };
}

/**
 * Get headers for API responses (less restrictive UI policies)
 */
export function getAPISecurityHeaders() {
  const isDev = process.env.NODE_ENV === 'development';

  return {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': isDev ? 'max-age=0' : 'max-age=63072000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };
}

/**
 * Apply API-specific security headers
 */
export function applyAPISecurityHeaders(response) {
  if (!response || !response.headers) {
    return response;
  }

  const headers = getAPISecurityHeaders();

  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}

/**
 * Generate CORS headers for cross-origin requests
 * @param {string} origin - The allowed origin(s)
 * @param {boolean} credentials - Whether to allow credentials
 * @returns {Object} CORS headers
 */
export function getCORSHeaders(origin = '*', credentials = false) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset',
  };

  if (credentials) {
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  return corsHeaders;
}

/**
 * Apply CORS headers to response
 */
export function applyCORSHeaders(response, origin = '*', credentials = false) {
  if (!response || !response.headers) {
    return response;
  }

  const headers = getCORSHeaders(origin, credentials);

  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}

/**
 * Handle preflight OPTIONS requests
 */
export function handlePreflightRequest(origin = '*', credentials = false) {
  const { NextResponse } = require('next/server');

  const response = new NextResponse(null, { status: 204 });
  return applyCORSHeaders(response, origin, credentials);
}

/**
 * Combine security headers with CORS headers
 */
export function applySecurityAndCORSHeaders(response, corsOrigin = '*', credentials = false) {
  response = applySecurityHeaders(response);
  response = applyCORSHeaders(response, corsOrigin, credentials);
  return response;
}

/**
 * Get headers based on response type (page vs API)
 */
export function getHeadersForType(type) {
  if (type === 'api') {
    return getAPISecurityHeaders();
  }
  return getSecurityHeaders();
}

/**
 * Apply headers based on response type
 */
export function applyHeadersByType(response, type = 'page') {
  if (type === 'api') {
    return applyAPISecurityHeaders(response);
  }
  return applySecurityHeaders(response);
}

export default {
  getSecurityHeaders,
  applySecurityHeaders,
  withSecurityHeaders,
  getAPISecurityHeaders,
  applyAPISecurityHeaders,
  getCORSHeaders,
  applyCORSHeaders,
  handlePreflightRequest,
  applySecurityAndCORSHeaders,
  getHeadersForType,
  applyHeadersByType,
};