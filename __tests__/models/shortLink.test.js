/**
 * Unit tests for ShortLink model
 */

import { generateShortCode, validateShortLink } from '@/models/ShortLink';

describe('ShortLink Model', () => {
    describe('generateShortCode', () => {
        it('should generate a code of default length 6', () => {
            const code = generateShortCode();
            expect(code).toHaveLength(6);
        });

        it('should generate a code of specified length', () => {
            const code = generateShortCode(10);
            expect(code).toHaveLength(10);
        });

        it('should only contain alphanumeric characters', () => {
            const code = generateShortCode();
            expect(code).toMatch(/^[A-Za-z0-9]+$/);
        });

        it('should generate unique codes', () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add(generateShortCode());
            }
            // At least 95% should be unique (allowing for rare collisions)
            expect(codes.size).toBeGreaterThan(95);
        });
    });

    describe('validateShortLink', () => {
        it('should return error when affiliateId is missing', () => {
            const result = validateShortLink({});
            expect(result).toBe('affiliateId is required');
        });

        it('should return null for valid data', () => {
            const result = validateShortLink({ affiliateId: 'abc123' });
            expect(result).toBeNull();
        });
    });
});
