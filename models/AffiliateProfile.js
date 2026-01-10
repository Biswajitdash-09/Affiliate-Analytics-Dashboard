/**
 * AffiliateProfile Model Definition
 * 
 * Note: This project uses the native MongoDB driver.
 */

import { ObjectId } from 'mongodb';

export const AFFILIATE_PROFILES_COLLECTION = 'affiliate_profiles';

export const AFFILIATE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
};

export const AffiliateProfileSchema = {
  userId: { type: 'ObjectId', required: true, ref: 'users' },
  commission_rate: { type: 'number', required: true, default: 0.10 }, // e.g., 0.10 for 10%
  commission_tiers: { type: 'array', default: null }, // e.g., [{ min_revenue: 0, rate: 0.10 }, { min_revenue: 10000, rate: 0.15 }]
  status: {
    type: 'string',
    enum: Object.values(AFFILIATE_STATUS),
    default: AFFILIATE_STATUS.PENDING
  },
  total_earnings: { type: 'number', default: 0 },
  pendingPayouts: { type: 'number', default: 0 }, // Changed from snake_case to camelCase
  createdAt: { type: 'date', default: () => new Date().toISOString() }
};

/**
 * Calculate the commission rate based on tiers and current total revenue.
 * @param {Object} profile - The affiliate profile
 * @param {number} currentRevenue - Current total revenue for the affiliate
 * @returns {number} - The applicable commission rate
 */
export function getCommissionRate(profile, currentRevenue = 0) {
  const tiers = profile?.commission_tiers;

  // If no tiers defined, use flat rate
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    return profile?.commission_rate || 0.10;
  }

  // Sort tiers by min_revenue descending to find highest applicable tier
  const sortedTiers = [...tiers].sort((a, b) => b.min_revenue - a.min_revenue);

  for (const tier of sortedTiers) {
    if (currentRevenue >= tier.min_revenue) {
      return tier.rate;
    }
  }

  // Fallback to flat rate
  return profile?.commission_rate || 0.10;
}

/**
 * Validates affiliate profile data
 * @param {Object} data 
 * @returns {string|null}
 */
export function validateAffiliateProfile(data) {
  if (!data.userId) return 'User ID is required';

  // Check if userId is a valid ObjectId string or object
  try {
    new ObjectId(data.userId);
  } catch (e) {
    return 'Invalid User ID format';
  }

  if (data.commission_rate !== undefined && typeof data.commission_rate !== 'number') {
    return 'Commission rate must be a number';
  }

  if (data.status && !Object.values(AFFILIATE_STATUS).includes(data.status)) {
    return `Status must be one of: ${Object.values(AFFILIATE_STATUS).join(', ')}`;
  }

  return null;
}

/**
 * Creates indexes for the Affiliate Profiles collection
 * @param {import('mongodb').Db} db
 */
export async function initAffiliateProfileIndexes(db) {
  await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ userId: 1 }, { unique: true });
  await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ status: 1 });
  await db.collection(AFFILIATE_PROFILES_COLLECTION).createIndex({ commission_rate: 1 }, { sparse: true }); // Filter by commission rate
}