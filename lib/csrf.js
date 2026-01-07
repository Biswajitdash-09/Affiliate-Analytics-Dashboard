/**
 * Cross-Site Request Forgery (CSRF) Protection
 * Implements CSRF protection using the double submit cookie pattern
 */

import { serialize, parse } from 'cookie';
import crypto from 'crypto';

/**
 * Generate a secure random CSRF token
 * @returns {string} CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Hash a CSRF token for comparison (prevent timing attacks)
 * @param {string} token - CSRF token to hash
 * @returns {string} Hashed token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create CSRF cookie options
 */
const getCSRFCookieOptions = () => {
  const isSecure = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  };
};

/**
 * Set CSRF token in response cookie
 * @param {Response} response - Next.js response object
 * @param {string} token - CSRF token
 */
export function setCSRFCookie(response, token) {
  const cookieOptions = getCSRFCookieOptions();
  const cookieValue = serialize('csrf_token', token, cookieOptions);

  response.headers.set('Set-Cookie', cookieValue);

  return response;
}

/**
 * Get CSRF token from request cookies
 * @param {Request} request - Next.js request object
 * @returns {string | null} CSRF token
 */
export function getCSRFCookie(request) {
  const cookieHeader = request.headers.get('cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookies = parse(cookieHeader);
  return cookies.csrf_token || null;
}

/**
 * Get CSRF token from request headers (for AJAX requests)
 * @param {Request} request - Next.js request object
 * @returns {string | null} CSRF token
 */
export function getCSRFHeader(request) {
  return request.headers.get('x-csrf-token') || null;
}

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @param {string} cookieToken - Token from cookie
 * @returns {boolean} True if valid
 */
export function validateCSRFToken(token, cookieToken) {
  if (!token || !cookieToken) {
    return false;
  }

  if (token !== cookieToken) {
    // Constant time comparison to prevent timing attacks
    const hashedToken = hashToken(token);
    const hashedCookieToken = hashToken(cookieToken);

    // Use a timing-safe comparison if available, otherwise simple comparison
    if (crypto.timingSafeEqual) {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(hashedToken),
          Buffer.from(hashedCookieToken)
        );
      } catch (error) {
        return false;
      }
    }

    return hashedToken === hashedCookieToken;
  }

  return true;
}

/**
 * CSRF Protection Middleware
 * Creates and validates CSRF tokens for state-changing operations
 */
export class CSRFMiddleware {
  constructor(options = {}) {
    this.cookieName = options.cookieName || 'csrf_token';
    this.headerName = options.headerName || 'x-csrf-token';
    this.exemptMethods = options.exemptMethods || ['GET', 'HEAD', 'OPTIONS'];
  }

  /**
   * Protect a request by validating CSRF token
   * @param {Request} request - Next.js request
   * @param {Response} response - Next.js response
   * @returns {Object} Result with valid flag and response
   */
  protect(request, response) {
    const method = request.method?.toUpperCase() || 'GET';

    // Exempt safe methods
    if (this.exemptMethods.includes(method)) {
      return { valid: true, response };
    }

    // Get tokens
    const cookieToken = getCSRFCookie(request);
    const headerToken = getCSRFHeader(request);

    // Validate tokens
    if (!validateCSRFToken(headerToken, cookieToken)) {
      return {
        valid: false,
        response: this.createErrorResponse('Invalid CSRF token'),
      };
    }

    return { valid: true, response };
  }

  /**
   * Generate and set a new CSRF token
   * @param {Response} response - Next.js response
   * @returns {Object} Result with token
   */
  generateToken(response) {
    const token = generateCSRFToken();
    setCSRFCookie(response, token);

    return {
      token,
      response,
    };
  }

  /**
   * Create an error response for CSRF violations
   * @param {string} message - Error message
   * @returns {Response} Error response
   */
  createErrorResponse(message = 'CSRF token validation failed') {
    const { NextResponse } = require('next/server');

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 403, // Forbidden
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * Create CSRF protection instance
 */
const csrf = new CSRFMiddleware();

/**
 * Middleware wrapper for Next.js routes
 * Usage in route handlers:
 * export async function POST(request) {
 *   const result = csrf.protect(request, NextResponse.next());
 *   if (!result.valid) return result.response;
 *   // Your route logic here
 * }
 */
export function withCSRF(handler) {
  return async function (request) {
    const { NextResponse } = await import('next/server');
    const response = NextResponse.next();

    const result = csrf.protect(request, response);

    if (!result.valid) {
      return result.response;
    }

    return handler(request);
  };
}

/**
 * Get or generate CSRF token for client
 * @param {Request} request - Next.js request
 * @param {Response} response - Next.js response
 * @returns {Object} Response with CSRF token
 */
export function getCSRFToken(request, response) {
  const cookieToken = getCSRFCookie(request);

  if (cookieToken) {
    // Return existing token
    return {
      token: cookieToken,
      hasToken: true,
    };
  }

  // Generate new token
  return csrf.generateToken(response);
}

/**
 * Middleware for API routes that require CSRF protection
 * @param {Request} request - Next.js request
 * @returns {(Response | null)} Returns error response if invalid, null if valid
 */
export function csrfMiddleware(request) {
  const { NextResponse } = require('next/server');
  const response = NextResponse.next();

  const result = csrf.protect(request, response);

  if (!result.valid) {
    return result.response;
  }

  return null; // Valid, proceed with request
}

/**
 * Generate CSRF token endpoint handler
 * @param {Request} request - Next.js request
 * @returns {Response} Response with CSRF token
 */
export async function generateCSRFTokenEndpoint(request) {
  const { NextResponse } = await import('next/server');
  const response = NextResponse.next();

  const cookieToken = getCSRFCookie(request);

  if (cookieToken) {
    return NextResponse.json({ token: cookieToken });
  }

  const token = generateCSRFToken();
  const result = csrf.generateToken(response);

  return NextResponse.json({ token: result.token });
}

/**
 * Validate token from form data
 * @param {string} token - Token from form
 * @param {string} cookieToken - Token from cookie
 * @returns {boolean} True if valid
 */
export function validateFormToken(token, cookieToken) {
  if (!token || !cookieToken) {
    return false;
  }

  return validateCSRFToken(token, cookieToken);
}

export default {
  generateCSRFToken,
  setCSRFCookie,
  getCSRFCookie,
  getCSRFHeader,
  validateCSRFToken,
  CSRFMiddleware,
  withCSRF,
  getCSRFToken,
  csrfMiddleware,
  generateCSRFTokenEndpoint,
  validateFormToken,
  csrf,
};