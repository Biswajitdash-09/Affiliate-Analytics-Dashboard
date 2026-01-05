/**
 * Payout Model Definition
 * 
 * Tracks payments made to affiliates.
 */

export const PAYOUTS_COLLECTION = 'payouts';

export const PAYOUT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

export const PayoutSchema = {
    affiliateId: { type: 'string', required: true }, // userId
    amount: { type: 'number', required: true },
    currency: { type: 'string', default: 'INR' },
    status: {
        type: 'string',
        enum: Object.values(PAYOUT_STATUS),
        default: PAYOUT_STATUS.PENDING
    },
    method: { type: 'string' }, // 'bank_transfer', 'paypal', 'manual'
    transactionId: { type: 'string' }, // Bank Ref ID
    notes: { type: 'string' },
    processedBy: { type: 'string' }, // Admin User ID
    createdAt: { type: 'date', default: () => new Date().toISOString() },
    completedAt: { type: 'date' }
};

export function validatePayout(data) {
    if (!data.affiliateId) return 'Affiliate ID is required';
    if (!data.amount || data.amount <= 0) return 'Valid amount is required';
    return null;
}
