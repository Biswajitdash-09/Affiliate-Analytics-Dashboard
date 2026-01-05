/**
 * Unit tests for AffiliateProfile model
 */

import { validateAffiliateProfile, getCommissionRate, AFFILIATE_STATUS } from '@/models/AffiliateProfile';

describe('AffiliateProfile Model', () => {
    describe('validateAffiliateProfile', () => {
        it('should return error when userId is missing', () => {
            const result = validateAffiliateProfile({});
            expect(result).toBe('User ID is required');
        });

        it('should return error for invalid userId format', () => {
            const result = validateAffiliateProfile({ userId: 'invalid-id' });
            expect(result).toBe('Invalid User ID format');
        });

        it('should return error for invalid status', () => {
            const result = validateAffiliateProfile({
                userId: '507f1f77bcf86cd799439011',
                status: 'invalid_status'
            });
            expect(result).toContain('Status must be one of');
        });

        it('should return null for valid data', () => {
            const result = validateAffiliateProfile({
                userId: '507f1f77bcf86cd799439011',
                status: AFFILIATE_STATUS.ACTIVE,
                commission_rate: 0.15
            });
            expect(result).toBeNull();
        });
    });

    describe('getCommissionRate', () => {
        it('should return flat rate when no tiers defined', () => {
            const profile = { commission_rate: 0.12 };
            expect(getCommissionRate(profile, 5000)).toBe(0.12);
        });

        it('should return default 0.10 when profile has no rate', () => {
            const profile = {};
            expect(getCommissionRate(profile, 0)).toBe(0.10);
        });

        it('should return correct tier rate based on revenue', () => {
            const profile = {
                commission_rate: 0.10,
                commission_tiers: [
                    { min_revenue: 0, rate: 0.10 },
                    { min_revenue: 10000, rate: 0.12 },
                    { min_revenue: 50000, rate: 0.15 }
                ]
            };

            expect(getCommissionRate(profile, 0)).toBe(0.10);
            expect(getCommissionRate(profile, 5000)).toBe(0.10);
            expect(getCommissionRate(profile, 10000)).toBe(0.12);
            expect(getCommissionRate(profile, 25000)).toBe(0.12);
            expect(getCommissionRate(profile, 50000)).toBe(0.15);
            expect(getCommissionRate(profile, 100000)).toBe(0.15);
        });
    });
});
