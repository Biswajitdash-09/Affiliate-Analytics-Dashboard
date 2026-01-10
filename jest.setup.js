import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Mock Next.js modules early (jest.mock is hoisted)
jest.mock('next/server', () => ({
    Request: class {
        constructor(url, options = {}) {
            this.url = url;
            this.method = options.method || 'GET';
            this.headers = new Map();
        }

        async json() {
            return this._json;
        }

        async text() {
            return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
        }
    },
    Response: class {
        constructor(body, options = {}) {
            this.body = body;
            this.status = options.status || 200;
            this.headers = new Map(options.headers || {});
        }

        json() {
            return Promise.resolve(this.body);
        }

        text() {
            return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
        }
    },
    NextResponse: {
        json: (body, options = {}) => ({
            body,
            status: options?.status || 200,
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
        }),
        redirect: (url) => ({
            status: 307,
            headers: new Map([['Location', url]]),
        }),
    },
}));

// Polyfill for TextEncoder and TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js Request and Response objects
class MockRequest {
    constructor(url, options = {}) {
        this.url = url;
        this.method = options.method || 'GET';
        this.headers = new Map();
        this.cookies = new Map();
        this.body = options.body;
        
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                this.headers.set(key, value);
            });
        }
    }

    async json() {
        if (typeof this.body === 'string') {
            return JSON.parse(this.body);
        }
        return this.body;
    }

    async text() {
        return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }

    clone() {
        return new MockRequest(this.url, {
            method: this.method,
            headers: Object.fromEntries(this.headers),
            body: this.body,
        });
    }
}

class MockResponse {
    constructor(body, options = {}) {
        this.body = body;
        this.status = options.status || 200;
        this.headers = new Map();
        
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, value]) => {
                this.headers.set(key, value);
            });
        }
    }

    json() {
        return Promise.resolve(this.body);
    }

    text() {
        return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
    }
}

// Make Request and Response available globally
global.Request = MockRequest;
global.Response = MockResponse;

// Mock Next.js NextResponse
global.NextResponse = {
    json: (body, options = {}) => {
        return new MockResponse(body, options);
    },
};

// Mock URLSearchParams
global.URLSearchParams = class {
    constructor(search) {
        this.params = new Map();
        if (search && typeof search === 'string') {
            search.slice(1).split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key) {
                    this.params.set(key, value ? decodeURIComponent(value) : '');
                }
            });
        }
    }

    get(key) {
        return this.params.get(key);
    }

    set(key, value) {
        this.params.set(key, value);
    }

    has(key) {
        return this.params.has(key);
    }

    delete(key) {
        this.params.delete(key);
    }

    append(key, value) {
        const existing = this.params.get(key);
        this.params.set(key, existing ? `${existing},${value}` : value);
    }

    toString() {
        return Array.from(this.params.entries())
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');
    }
};

// Mock crypto token generation
global.crypto = {
    randomBytes: (size) => {
        const bytes = [];
        for (let i = 0; i < size; i++) {
            bytes.push(Math.floor(Math.random() * 256));
        }
        return Buffer.from(bytes);
    },
};

// Mock JSON Web Token (JWT)
jest.mock('jsonwebtoken', () => ({
    sign: jest.fn((payload, secret, options) => 'mock-jwt-token'),
    verify: jest.fn((token, secret) => ({
        userId: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        role: 'affiliate',
    })),
}));

// Mock email service
jest.mock('@/lib/email', () => ({
    sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));
