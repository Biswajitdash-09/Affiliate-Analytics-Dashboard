import { NextResponse } from 'next/server';
import { applySecurityHeaders, applyAPISecurityHeaders, handlePreflightRequest } from '@/lib/security-headers';
import * as jose from 'jose';

// Simple in-memory store for rate limiting
// Note: In a distributed/serverless environment, use Redis or a similar external store.
const rateLimit = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Every 5 minutes

// Periodic cleanup of expired rate limit entries
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        const windowMs = 60 * 1000; // 1 minute window

        for (const [key, value] of rateLimit.entries()) {
            if (!value || value.length === 0) {
                rateLimit.delete(key);
            } else {
                // Filter out old timestamps
                const filtered = value.filter(timestamp => timestamp > now - windowMs);
                if (filtered.length === 0) {
                    rateLimit.delete(key);
                } else {
                    rateLimit.set(key, filtered);
                }
            }
        }
    }, CLEANUP_INTERVAL);
}

export async function middleware(request) {
    const ip = request.ip || '127.0.0.1';
    const path = request.nextUrl.pathname;
    const method = request.method;

    // Handle preflight OPTIONS requests (CORS)
    if (method === 'OPTIONS') {
        return handlePreflightRequest();
    }

    // Define limits
    // limit: max requests
    // window: time in ms
    let limit = 100; // Default: 100 reqs per min
    const windowMs = 60 * 1000;

    // Stricter limits for critical paths
    if (path.startsWith('/api/auth')) {
        limit = 20; // Increased from 5 to 20 for better DX/testing
    } else if (path.startsWith('/api/tracking')) {
        limit = 60; // 60 reqs per min for tracking
    } else if (path.startsWith('/api/admin')) {
        limit = 50; // Admin endpoints limit
    }

    // ==============================
    // AUTHENTICATION & ROLE CHECKS
    // ==============================

    // Protected dashboard routes
    const protectedRoutes = [
        '/dashboard',
        '/dashboard/admin',
        '/dashboard/affiliates',
        '/dashboard/campaigns',
        '/dashboard/payouts',
        '/dashboard/my-portal',
        '/dashboard/fraud',
        '/dashboard/settings',
        '/dashboard/help',
        '/dashboard/integration',
        '/dashboard/postback-docs',
    ];

    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));

    if (isProtectedRoute) {
        // Get token from Authorization header or cookie
        const authHeader = request.headers.get('authorization');
        const cookieHeader = request.headers.get('cookie');

        let token = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (cookieHeader) {
            // Try to extract token from cookie
            const tokenMatch = cookieHeader.match(/token=([^;]+)/);
            if (tokenMatch) {
                token = tokenMatch[1];
            }
        }

        if (!token) {
            // No token found - redirect to login
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', path);
            return NextResponse.redirect(loginUrl);
        }

        try {
            // Verify JWT token
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                console.error('CRITICAL: JWT_SECRET is not configured');
                return new NextResponse(
                    JSON.stringify({ error: 'Server configuration error' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const { payload: decoded } = await jose.jwtVerify(
                token,
                new TextEncoder().encode(JWT_SECRET)
            );
            const userRole = decoded.role;
            const userId = decoded.userId;

            // Role-based route protection

            // ADMIN ONLY ROUTES
            const adminOnlyRoutes = [
                '/dashboard/admin',
                '/dashboard/affiliates',
                '/dashboard/fraud',
            ];

            const isAdminOnlyRoute = adminOnlyRoutes.some(route => path.startsWith(route));

            if (isAdminOnlyRoute && userRole !== 'admin') {
                // Affiliate trying to access admin route - redirect to their portal
                const portalUrl = new URL('/dashboard/my-portal', request.url);
                return NextResponse.redirect(portalUrl);
            }

            // AFFILIATE ROUTE PROTECTION
            const affiliateRoutes = [
                '/dashboard/my-portal',
            ];

            const isAffiliateRoute = affiliateRoutes.some(route => path.startsWith(route));

            if (isAffiliateRoute && userRole !== 'affiliate') {
                // Admin trying to access affiliate portal - redirect to main dashboard
                const dashboardUrl = new URL('/dashboard', request.url);
                return NextResponse.redirect(dashboardUrl);
            }

            // SMART REDIRECTION FOR DASHBOARD ROOT
            if (path === '/dashboard' || path === '/dashboard/') {
                if (userRole === 'affiliate') {
                    // Affiliate accessing /dashboard - redirect to their portal
                    const portalUrl = new URL('/dashboard/my-portal', request.url);
                    return NextResponse.redirect(portalUrl);
                }
                // Admin stays on /dashboard
            }

        } catch (error) {
            console.error('Middleware auth error:', error);

            // Token verification failed - redirect to login
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', path);
            return NextResponse.redirect(loginUrl);
        }
    }

    // ==============================
    // API ROUTE PROTECTION
    // ==============================

    const protectedApiRoutes = [
        '/api/affiliate',
        '/api/admin',
        '/api/payouts',
        '/api/campaigns', // Added to protected routes
    ];

    const isProtectedApiRoute = protectedApiRoutes.some(route => path.startsWith(route));

    // All protected API routes require authentication
    if (isProtectedApiRoute) {
        const authHeader = request.headers.get('authorization');
        const cookieHeader = request.headers.get('cookie');

        let token = null;

        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else if (cookieHeader) {
            const tokenMatch = cookieHeader.match(/token=([^;]+)/);
            if (tokenMatch) {
                token = tokenMatch[1];
            }
        }

        if (!token) {
            return new NextResponse(
                JSON.stringify({ success: false, error: 'Unauthorized - Authentication required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Verify JWT token and check admin role for admin routes
        try {
            const JWT_SECRET = process.env.JWT_SECRET;
            if (!JWT_SECRET) {
                console.error('CRITICAL: JWT_SECRET is not configured');
                return new NextResponse(
                    JSON.stringify({ success: false, error: 'Server configuration error' }),
                    { status: 500, headers: { 'Content-Type': 'application/json' } }
                );
            }

            const { payload: decoded } = await jose.jwtVerify(
                token,
                new TextEncoder().encode(JWT_SECRET)
            );

            // Admin routes specifically require admin role
            if (path.startsWith('/api/admin') && decoded.role !== 'admin') {
                return new NextResponse(
                    JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
                    { status: 403, headers: { 'Content-Type': 'application/json' } }
                );
            }
        } catch (error) {
            return new NextResponse(
                JSON.stringify({ success: false, error: 'Unauthorized - Invalid or expired token' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
    }

    // ==============================
    // RATE LIMITING
    // ==============================

    // Bypass for Next.js internal paths and statics
    if (path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')) {
        const response = NextResponse.next();
        return applySecurityHeaders(response);
    }

    const now = Date.now();
    const windowStart = now - windowMs;

    let requestLog = rateLimit.get(ip) || [];

    // Filter out old requests from the window
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

    // Delete entry if no recent requests (cleanup)
    if (requestLog.length === 0) {
        rateLimit.delete(ip);
    }

    // Check limit
    if (requestLog.length >= limit) {
        const retryAfter = Math.ceil(((requestLog[0] + windowMs) - now) / 1000);
        return new NextResponse(
            JSON.stringify({
                success: false,
                error: 'Too many requests, please try again later.',
                retryAfter
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': retryAfter.toString(),
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                }
            }
        );
    }

    // Record current request
    requestLog.push(now);
    rateLimit.set(ip, requestLog);

    // Proactive cleanup: delete entries with empty arrays to prevent memory accumulation
    // This is more efficient than clearing the entire map when it grows too large
    if (rateLimit.size > 1000) {
        // Check every 100th entry for cleanup to minimize performance impact
        let cleanedCount = 0;
        const maxIterations = 100;
        const entriesIterator = rateLimit.entries();

        for (let i = 0; i < maxIterations; i++) {
            const entry = entriesIterator.next();
            if (entry.done) break;

            const [key, value] = entry.value;
            if (!value || value.length === 0 || value.every(timestamp => timestamp <= windowStart)) {
                rateLimit.delete(key);
                cleanedCount++;
            }
        }
    }

    // Apply security headers and pass through
    const response = NextResponse.next();

    // Apply API-specific security headers to API routes
    if (path.startsWith('/api')) {
        return applyAPISecurityHeaders(response);
    }

    // Apply full security headers to pages
    return applySecurityHeaders(response);
}

export const config = {
    matcher: [
        // Match all paths except for:
        // 1. /api/* - apply to all API routes
        // 2. _next/static (static files)
        // 3. _next/image (image optimization files)
        // 4. favicon.ico (favicon file)
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
        '/api/:path*',
    ],
};
