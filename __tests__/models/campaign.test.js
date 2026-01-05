/**
 * Unit tests for Campaign model
 */

import { validateCampaign, CAMPAIGN_STATUS } from '@/models/Campaign';

describe('Campaign Model', () => {
    describe('validateCampaign', () => {
        it('should return error when name is missing', () => {
            const result = validateCampaign({ url: 'https://example.com', payout_rules: {} });
            expect(result).toBe('Campaign name is required');
        });

        it('should return error when URL is missing', () => {
            const result = validateCampaign({ name: 'Test Campaign', payout_rules: {} });
            expect(result).toBe('Campaign URL is required');
        });

        it('should return error when payout_rules is missing', () => {
            const result = validateCampaign({
                name: 'Test Campaign',
                url: 'https://example.com'
            });
            expect(result).toBe('Payout rules are required');
        });

        it('should return error for invalid status', () => {
            const result = validateCampaign({
                name: 'Test Campaign',
                url: 'https://example.com',
                payout_rules: { type: 'CPA', amount: 100 },
                status: 'invalid_status'
            });
            expect(result).toContain('Status must be one of');
        });

        it('should return null for valid data', () => {
            const result = validateCampaign({
                name: 'Test Campaign',
                url: 'https://example.com?ref={affiliate_id}',
                payout_rules: { type: 'CPA', amount: 100 },
                status: CAMPAIGN_STATUS.ACTIVE
            });
            expect(result).toBeNull();
        });
    });
});
