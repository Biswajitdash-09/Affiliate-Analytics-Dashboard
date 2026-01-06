import { NextResponse } from 'next/server';
import { applySecurityHeaders, applyAPISecurityHeaders, handlePreflightRequest } from '@/lib/security-headers';

// Simple in-memory store for rate limiting
// Note: In a distributed/serverless environment, use Redis or a similar external store.
const rateLimit = new Map();

export function middleware(request) {
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

    // Bypass for Next.js internal paths and statics
    if (path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')) {
        const response = NextResponse.next();
        return applySecurityHeaders(response);
    }

    // Rate Limiting Logic
    const now = Date.now();
    const windowStart = now - windowMs;

    let requestLog = rateLimit.get(ip) || [];

    // Filter out old requests from the window
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

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

    // Clean up memory occasionally (basic garbage collection for the map)
    if (rateLimit.size > 10000) {
        rateLimit.clear(); // Extreme fallback to prevent memory leaks in this simple implementation
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
