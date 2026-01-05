import { NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
// Note: In a distributed/serverless environment, use Redis or a similar external store.
const rateLimit = new Map();

export function middleware(request) {
    const ip = request.ip || '127.0.0.1';
    const path = request.nextUrl.pathname;

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
    }

    // Bypass for Next.js internal paths and statics
    if (path.startsWith('/_next') || path.startsWith('/static') || path.includes('.')) {
        return NextResponse.next();
    }

    // Rate Limiting Logic
    const now = Date.now();
    const windowStart = now - windowMs;

    let requestLog = rateLimit.get(ip) || [];

    // Filter out old requests from the window
    requestLog = requestLog.filter(timestamp => timestamp > windowStart);

    // Check limit
    if (requestLog.length >= limit) {
        return new NextResponse(
            JSON.stringify({ success: false, error: 'Too many requests, please try again later.' }),
            { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // Record current request
    requestLog.push(now);
    rateLimit.set(ip, requestLog);

    // Clean up memory occasionally (basic garbage collection for the map)
    if (rateLimit.size > 10000) {
        rateLimit.clear(); // Extreme fallback to prevent memory leaks in this simple implementation
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
