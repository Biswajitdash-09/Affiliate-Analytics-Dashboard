import { ObjectId } from 'mongodb';

export const SHORTLINKS_COLLECTION = 'short_links';

/**
 * ShortLink Schema
 * Stores shortened URLs for affiliate tracking links.
 */
export const ShortLinkSchema = {
    code: { type: 'string', required: true }, // Unique 6-char code
    affiliateId: { type: 'string', required: true },
    campaignId: { type: 'string', required: false },
    targetUrl: { type: 'string', required: true }, // Full tracking URL
    clicks: { type: 'number', default: 0 },
    createdAt: { type: 'string', required: true },
};

/**
 * Generate a random alphanumeric code.
 * @param {number} length - Length of the code (default: 6)
 * @returns {string}
 */
export function generateShortCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validate short link data before insertion.
 * @param {object} data 
 * @returns {string|null} - Error message or null if valid
 */
export function validateShortLink(data) {
    if (!data.affiliateId) {
        return 'affiliateId is required';
    }
    return null;
}

/**
 * Initialize indexes for short_links collection.
 * @param {import('mongodb').Db} db 
 */
export async function initShortLinkIndexes(db) {
    const collection = db.collection(SHORTLINKS_COLLECTION);
    await collection.createIndex({ code: 1 }, { unique: true });
    await collection.createIndex({ affiliateId: 1 });
}
