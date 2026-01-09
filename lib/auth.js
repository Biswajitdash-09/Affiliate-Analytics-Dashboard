/**
 * Authentication Utilities
 * Provides JWT verification helpers for API route protection.
 */

import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Extract and verify JWT token from request headers.
 * @param {Request} request - Next.js request object
 * @returns {{ success: boolean, user?: object, error?: string }}
 */
export function verifyAuth(request) {
    if (!JWT_SECRET) {
        console.error('CRITICAL: JWT_SECRET is not set in environment variables.');
        return { success: false, error: 'Server configuration error' };
    }

    const authHeader = request.headers.get('authorization');
    const cookieHeader = request.headers.get('cookie');

    // Try Authorization header first
    let token = null;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (cookieHeader) {
        // Fallback to cookie
        const match = cookieHeader.match(/token=([^;]+)/);
        if (match) {
            token = match[1];
        }
    }

    if (!token) {
        return { success: false, error: 'Authorization token required' };
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { success: true, user: decoded };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return { success: false, error: 'Token has expired' };
        }
        return { success: false, error: 'Invalid token' };
    }
}

/**
 * Middleware wrapper to require authentication.
 * Returns a 401 response if auth fails.
 * @param {Request} request
 * @returns {NextResponse | null} - Returns error response or null if valid
 */
export function requireAuth(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json(
            { success: false, error: auth.error },
            { status: 401 }
        );
    }
    return null; // Auth successful, continue
}

/**
 * Middleware wrapper to require admin role.
 * @param {Request} request
 * @returns {NextResponse | null}
 */
export function requireAdmin(request) {
    const auth = verifyAuth(request);
    if (!auth.success) {
        return NextResponse.json(
            { success: false, error: auth.error },
            { status: 401 }
        );
    }
    if (auth.user?.role !== 'admin') {
        return NextResponse.json(
            { success: false, error: 'Admin access required' },
            { status: 403 }
        );
    }
    return null; // Admin auth successful
}

/**
 * Get the authenticated user from request.
 * Call this AFTER requireAuth or requireAdmin has passed.
 * @param {Request} request
 * @returns {object | null}
 */
export function getAuthUser(request) {
    const auth = verifyAuth(request);
    return auth.success ? auth.user : null;
}

export default {
    verifyAuth,
    requireAuth,
    requireAdmin,
    getAuthUser,
};
